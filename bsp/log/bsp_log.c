#include "bsp_log.h"

#include <inttypes.h>
#include <math.h>
#include <stdatomic.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>

#include "FreeRTOS.h"
#include "comp_utils.h"
#include "stm32f4xx.h"
#include "task.h"

#if BSP_LOG_ENABLED
#include "semphr.h"
#endif

#ifndef configBSP_LOG_TLS_ERROR_INDEX
#error "Define configBSP_LOG_TLS_ERROR_INDEX in FreeRTOSConfig.h"
#elif configBSP_LOG_TLS_ERROR_INDEX < 0
#error "configBSP_LOG_TLS_ERROR_INDEX must be nonnegative"
#elif configNUM_THREAD_LOCAL_STORAGE_POINTERS <= configBSP_LOG_TLS_ERROR_INDEX
#error                                                                         \
    "Increase configNUM_THREAD_LOCAL_STORAGE_POINTERS to include the bsp_log TLS slot"
#endif

_Static_assert(OK == 0, "A new task's NULL TLS slot must represent OK");

/* ==================== 内部类型 ==================== */

#if BSP_LOG_ENABLED
/* 事件只在一次同步输出期间有效；输出回调不保留指针或参数列表。 */
typedef struct {
  bsp_log_level_t level;
  const char *file;
  int line;
  const char *tag;
  const char *format;
  va_list args;
} bsp_log_event_t;
#endif

/* ==================== 模块状态 ==================== */

static err_t startup_error = OK;
static _Atomic uint8_t current_level = BSP_LOG_DEFAULT_LEVEL;

#if BSP_LOG_ENABLED
/* RTT 通道缓冲区必须在整个程序运行期间保持有效。 */
static char data_buffer[BSP_LOG_DATA_BUFFER_SIZE];
static char reserved_buffer[BSP_LOG_RESERVED_BUFFER_SIZE];

/* 任务阶段的日志发送状态与静态互斥锁。 */
static bool log_initialized;
static StaticSemaphore_t log_mutex_storage;
static SemaphoreHandle_t log_mutex = NULL;

/* 下行等级命令的跨次轮询状态。 */
static char level_command_buffer[BSP_LOG_COMMAND_BUFFER_SIZE];
/* 长度达到缓冲区容量时表示命令超长，丢弃后续字节直到换行。 */
static size_t level_command_size;
#endif

/* ==================== 内部函数声明 ==================== */

static bool BSPLogInThreadMode(void);
static err_t BSPLogRecordResult(err_t result);
static err_t BSPLogValidateLevel(bsp_log_level_t level);

#if BSP_LOG_ENABLED
static bool BSPLogContextAllowsWrite(void);
static const char *BSPLogLevelName(bsp_log_level_t level);
static err_t BSPLogLock(void);
static err_t BSPLogUnlock(void);
static err_t BSPLogWriteRaw(const char *data, size_t size);
static err_t BSPLogTerminalCallback(bsp_log_event_t *event);
static bool BSPLogMatchIgnoreCase(const char *value, const char *pattern,
                                  bool exact_match);
static char *BSPLogTrimCommand(char *command);
static err_t BSPLogParseLevelCommand(const char *command,
                                     bsp_log_level_t *level);
static err_t BSPLogApplyLevelCommand(void);
#endif

/* ==================== 公共接口：初始化与日志输出 ==================== */

err_t BSPLogInit(void) {
#if BSP_LOG_ENABLED
  err_t result = OK;

  if (!BSPLogInThreadMode() ||
      xTaskGetSchedulerState() != taskSCHEDULER_NOT_STARTED) {
    return BSPLogRecordResult(STATE_ERR);
  }
  if (log_initialized) {
    return BSPLogRecordResult(OK);
  }

  /* 在重复初始化检查之后才重置 RTT 控制块。 */
  SEGGER_RTT_Init();
  /* 显式选择非阻塞整条跳过模式，避免依赖 RTT 默认配置。 */
  if (SEGGER_RTT_SetFlagsUpBuffer(BSP_LOG_CHANNEL_TERMINAL,
                                  SEGGER_RTT_MODE_NO_BLOCK_SKIP) < 0) {
    return BSPLogRecordResult(INIT_ERR);
  }
  /* 保留数据通道 1 原有的 JScope 格式描述。 */
  result = (SEGGER_RTT_ConfigUpBuffer(BSP_LOG_CHANNEL_DATA, "JScope_t4f4f4f4",
                                      data_buffer, sizeof(data_buffer),
                                      SEGGER_RTT_MODE_NO_BLOCK_SKIP) < 0)
               ? INIT_ERR
               : OK;
  if (result == OK) {
    /* 预留通道 2 与终端文本通道 0 使用不同缓冲区。 */
    result = (SEGGER_RTT_ConfigUpBuffer(
                  BSP_LOG_CHANNEL_RESERVED, "Reserved", reserved_buffer,
                  sizeof(reserved_buffer), SEGGER_RTT_MODE_NO_BLOCK_SKIP) < 0)
                 ? INIT_ERR
                 : OK;
  }
  if (result == OK) {
    log_mutex = xSemaphoreCreateMutexStatic(&log_mutex_storage);
    if (log_mutex == NULL) {
      return BSPLogRecordResult(INIT_ERR);
    }
    /* 所有通道配置成功后，才发布默认等级和可用状态。 */
    atomic_store_explicit(&current_level, BSP_LOG_DEFAULT_LEVEL,
                          memory_order_release);
    log_initialized = true;
  }
  return BSPLogRecordResult(result);
#else
  return BSPLogRecordResult(NOT_SUPPORT);
#endif
}

err_t BSPLogWrite(bsp_log_level_t level, const char *file, int line,
                  const char *tag, const char *format, ...) {
  err_t result;
  va_list args;
  va_start(args, format);
  result = BSPLogVWrite(level, file, line, tag, format, args);
  va_end(args);
  return result;
}

err_t BSPLogVWrite(bsp_log_level_t level, const char *file, int line,
                   const char *tag, const char *format, va_list args) {
#if BSP_LOG_ENABLED
  bsp_log_event_t event = {
      .level = level,
      .file = file,
      .line = line,
      .tag = tag,
      .format = format,
  };
  err_t result;
  err_t unlock_result;

  if (BSPLogValidateLevel(level) != OK) {
    return BSPLogRecordResult(ARG_ERR);
  }
  if (file == NULL || tag == NULL || format == NULL) {
    return BSPLogRecordResult(PTR_NULL);
  }
  if (!log_initialized) {
    return BSPLogRecordResult(INIT_ERR);
  }
  /* 等级过滤不执行格式化或 RTT 输出，也不修改已保存的错误状态。
   * PENDING 表示本条记录被丢弃，不存在排队或稍后补发。 */
  if (level < (bsp_log_level_t)atomic_load_explicit(&current_level,
                                                    memory_order_acquire)) {
    return PENDING;
  }
  if (!BSPLogContextAllowsWrite()) {
    return BSPLogRecordResult(STATE_ERR);
  }

  result = BSPLogLock();
  if (result != OK) {
    return BSPLogRecordResult(result);
  }

  /* 与参考库为每个回调建立独立参数列表的做法一致。
   * 这里复制调用者的 va_list，所有输出结果都先清理，再统一记录状态。 */
  va_copy(event.args, args);
  result = BSPLogTerminalCallback(&event);
  va_end(event.args);
  unlock_result = BSPLogUnlock();
  return BSPLogRecordResult(unlock_result != OK ? unlock_result : result);
#else
  /* 日志关闭时，直接调用接口仍返回明确状态；LOG_* 宏则完全不求值参数。 */
  RM_UNUSED(level);
  RM_UNUSED(file);
  RM_UNUSED(line);
  RM_UNUSED(tag);
  RM_UNUSED(format);
  RM_UNUSED(args);
  return BSPLogRecordResult(NOT_SUPPORT);
#endif
}

err_t BSPLogClear(void) {
#if BSP_LOG_ENABLED
  static const char clear[] = "  " RTT_CTRL_CLEAR;
  err_t result;
  err_t unlock_result;

  if (!log_initialized) {
    return BSPLogRecordResult(INIT_ERR);
  }
  if (!BSPLogContextAllowsWrite()) {
    return BSPLogRecordResult(STATE_ERR);
  }
  result = BSPLogLock();
  if (result != OK) {
    return BSPLogRecordResult(result);
  }
  result = BSPLogWriteRaw(clear, sizeof(clear) - 1u);
  unlock_result = BSPLogUnlock();
  return BSPLogRecordResult(unlock_result != OK ? unlock_result : result);
#else
  return BSPLogRecordResult(NOT_SUPPORT);
#endif
}

/* ==================== 公共接口：等级控制与命令轮询 ==================== */

err_t BSPLogSetLevel(bsp_log_level_t level) {
  const err_t valid = BSPLogValidateLevel(level);
  if (valid != OK) {
    return BSPLogRecordResult(valid);
  }
  atomic_store_explicit(&current_level, (uint8_t)level, memory_order_release);
  return BSPLogRecordResult(OK);
}

err_t BSPLogGetLevel(bsp_log_level_t *level) {
  if (level == NULL) {
    return BSPLogRecordResult(PTR_NULL);
  }
  *level = (bsp_log_level_t)atomic_load_explicit(&current_level,
                                                 memory_order_acquire);
  return OK;
}

err_t BSPLogPollLevelCommand(void) {
#if BSP_LOG_ENABLED
  int byte;
  err_t result = PENDING;

  if (!BSPLogContextAllowsWrite()) {
    return BSPLogRecordResult(STATE_ERR);
  }
  if (!log_initialized) {
    return BSPLogRecordResult(INIT_ERR);
  }

  /* GetKey 固定读取下行通道 0；无数据时返回 -1，不等待主机。 */
  while ((byte = SEGGER_RTT_GetKey()) >= 0) {
    if (byte == '\r' || byte == '\n') {
      if (level_command_size == 0u) {
        continue;
      }
      result = level_command_size < sizeof(level_command_buffer)
                   ? BSPLogApplyLevelCommand()
                   : BSPLogRecordResult(ARG_ERR);
      level_command_size = 0u;
    } else if (level_command_size < sizeof(level_command_buffer)) {
      level_command_buffer[level_command_size++] = (char)byte;
    }
  }

  return result;
#else
  return BSPLogRecordResult(NOT_SUPPORT);
#endif
}

/* ==================== 公共接口：任务状态查询 ==================== */

err_t BSPLogGetLastError(void) {
  if (!BSPLogInThreadMode()) {
    return STATE_ERR;
  }
  if (xTaskGetSchedulerState() == taskSCHEDULER_NOT_STARTED) {
    return startup_error;
  }
  return (err_t)(intptr_t)pvTaskGetThreadLocalStoragePointer(
      NULL, configBSP_LOG_TLS_ERROR_INDEX);
}

/* ==================== 公共工具：数值转换 ==================== */

int Float2StrN(char *str, size_t size, float va) {
  double rounded;
  uint64_t magnitude;
  uint64_t integer;
  uint32_t fraction;
  int result;

  if ((str == NULL) || (size == 0u) || !isfinite(va)) {
    if ((str != NULL) && (size != 0u)) {
      str[0] = '\0';
    }
    return -1;
  }

  /* 保留三位小数，中点向远离零的方向取整。避免直接使用 %.3f，
   * 以保留现有的边界舍入和零值符号规则。 */
  rounded = round((double)va * 1000.0);

  /* INT64_MAX 转为 double 后会成为 2^63，因此使用精确的二进制边界检查。
   * 先验证有符号范围，避免有风险的 double 到 int64_t 转换；
   * 通过检查后，绝对值可安全存入 uint64_t。 */
  if (rounded < -0x1p63 || rounded >= 0x1p63) {
    str[0] = '\0';
    return -1;
  }

  /* 仅对严格小于零的取整结果输出负号，取整后为零时输出 0.000。
   * 将整数按十亿拆为 uint32_t 分组，兼容不支持 long long 格式的 newlib-nano。
   * 存在高位分组时，低位补齐九位，小数补齐三位；由 snprintf 完成
   * 十进制转换、截断、NUL 终止和完整所需长度的计算。 */
  magnitude = (uint64_t)fabs(rounded);
  integer = magnitude / 1000u;
  fraction = (uint32_t)(magnitude % 1000u);
  if (integer < 1000000000u) {
    result = snprintf(str, size, "%s%" PRIu32 ".%03" PRIu32,
                      rounded < 0.0 ? "-" : "", (uint32_t)integer, fraction);
  } else {
    result =
        snprintf(str, size, "%s%" PRIu32 "%09" PRIu32 ".%03" PRIu32,
                 rounded < 0.0 ? "-" : "", (uint32_t)(integer / 1000000000u),
                 (uint32_t)(integer % 1000000000u), fraction);
  }
  if (result < 0) {
    str[0] = '\0';
    return -1;
  }
  return result;
}

/* ==================== 内部实现：上下文与状态管理 ==================== */

static bool BSPLogInThreadMode(void) {
  return __get_IPSR() == BSP_LOG_IPSR_THREAD_MODE;
}

static err_t BSPLogRecordResult(err_t result) {
  if (result == PENDING || !BSPLogInThreadMode()) {
    return result;
  }
  if (xTaskGetSchedulerState() == taskSCHEDULER_NOT_STARTED) {
    startup_error = result;
  } else {
    /* NULL 表示当前任务。将状态经 intptr_t 编码为指针值保存，不解引用。
     * 新任务的 TLS 初值为 NULL，解码后恰好为 OK（0）。 */
    vTaskSetThreadLocalStoragePointer(NULL, configBSP_LOG_TLS_ERROR_INDEX,
                                      (void *)(intptr_t)result);
  }
  return result;
}

/**
 * @brief 验证日志等级是否在有效范围内。
 *
 * @param[in] level 要验证的日志等级。
 * @return 验证结果，具体取值如下。
 * @retval OK 等级有效。
 * @retval ARG_ERR 等级无效。
 * @note 该函数不修改已保存的错误状态。
 */
static err_t BSPLogValidateLevel(bsp_log_level_t level) {
  return ((unsigned)level < BSP_LOG_LEVEL_COUNT) ? OK : ARG_ERR;
}

#if BSP_LOG_ENABLED

static bool BSPLogContextAllowsWrite(void) {
  BaseType_t scheduler_state;

  if (!BSPLogInThreadMode()) {
    return false;
  }
  /* 只查询一次调度器状态，后续判断使用同一次结果。NOT_STARTED
   * 使用启动阶段状态，RUNNING 允许任务输出；SUSPENDED 拒绝操作日志互斥锁。 */
  scheduler_state = xTaskGetSchedulerState();

  /* 调度器状态和两组中断屏蔽条件必须同时满足。 */
  return (scheduler_state == taskSCHEDULER_NOT_STARTED ||
          scheduler_state == taskSCHEDULER_RUNNING) &&
         /* 要求 PRIMASK 为 0，避免在可配置优先级异常被全局屏蔽期间格式化。
          * NMI 和 HardFault 不受 PRIMASK 屏蔽。 */
         (__get_PRIMASK() == BSP_LOG_PRIMASK_UNMASKED) &&
         /* 还要求 BASEPRI 为 0；即使 PRIMASK 为 0，FreeRTOS 临界区仍可能
          * 通过 BASEPRI 屏蔽较低优先级异常。 */
         (__get_BASEPRI() == BSP_LOG_BASEPRI_UNMASKED);
}

/* ==================== 内部实现：RTT 发送 ==================== */

static const char *BSPLogLevelName(bsp_log_level_t level) {
  static const char *const names[] = {"TRACE", "DEBUG", "INFO",
                                      "WARN",  "ERROR", "FATAL"};
  return ((unsigned)level < ARRAY_LEN(names)) ? names[level] : "UNKNOWN";
}

/* 启动阶段只有一个调用线程；任务阶段用静态互斥锁串行化整条记录。
 * 锁忙时立即跳过，不等待；RTT 自身的锁只保护单次分段复制。 */
static err_t BSPLogLock(void) {
  if (xTaskGetSchedulerState() != taskSCHEDULER_NOT_STARTED &&
      xSemaphoreTake(log_mutex, 0u) != pdTRUE) {
    return BUSY;
  }
  return OK;
}

static err_t BSPLogUnlock(void) {
  if (xTaskGetSchedulerState() != taskSCHEDULER_NOT_STARTED &&
      xSemaphoreGive(log_mutex) != pdTRUE) {
    return STATE_ERR;
  }
  return OK;
}

static err_t BSPLogWriteRaw(const char *data, size_t size) {
  const unsigned written =
      SEGGER_RTT_Write(BSP_LOG_CHANNEL_TERMINAL, data, (unsigned)size);
  return (written == size) ? OK : NO_BUFF;
}

/**
 * @brief 使用 RTT 原生格式化接口发送已通过检查的日志事件。
 * @param[in,out] event 仅在本次调用期间有效的事件，消耗其私有参数列表。
 * @return OK 或 NO_BUFF；由分发入口记录错误状态。
 * @note 调用者持有日志互斥锁；RTT 空间不足时可能已发送部分记录。
 */
static err_t BSPLogTerminalCallback(bsp_log_event_t *event) {
  static const char line_end[] = "\r\n";
  if (SEGGER_RTT_printf(BSP_LOG_CHANNEL_TERMINAL,
                        "[%s][%s] %s:%d: ", BSPLogLevelName(event->level),
                        event->tag, event->file, event->line) < 0) {
    return NO_BUFF;
  }
  if (SEGGER_RTT_vprintf(BSP_LOG_CHANNEL_TERMINAL, event->format,
                         &event->args) < 0) {
    return NO_BUFF;
  }
  return BSPLogWriteRaw(line_end, sizeof(line_end) - 1u);
}

/* ==================== 内部实现：等级命令解析 ==================== */

/**
 * @brief 比较两个字符串，忽略大小写。
 *
 * @param[in] value 要判断的字符串
 * @param[in] pattern 需要匹配的字符串
 * @param[in] exact_match 是否要求 value 在匹配后立即结束
 * @return 匹配成功返回 true；否则返回 false。
 * @note exact_match为 true 时，要求 value 与 pattern 完全匹配。
 *       exact_match为 false 时,只要求 value 以 pattern 开头。
 */
static bool BSPLogMatchIgnoreCase(const char *value, const char *pattern,
                                  bool exact_match) {
  while (*pattern != '\0' && *value != '\0') {
    char value_char = *value++;
    char pattern_char = *pattern++;
    if (value_char >= 'a' && value_char <= 'z') {
      value_char = (char)(value_char - ('a' - 'A'));
    }
    if (pattern_char >= 'a' && pattern_char <= 'z') {
      pattern_char = (char)(pattern_char - ('a' - 'A'));
    }
    if (value_char != pattern_char) {
      return false;
    }
  }

  if (*pattern != '\0') {
    return false;
  }
  return !exact_match || *value == '\0';
}

/** @brief 去除命令字符串首尾的空白字符。
 *
 * @param[in] command 要处理的命令字符串。
 * @return 指向去除首尾空白后的字符串的指针。
 * @note 该函数会去除命令字符串首尾的空格和制表符，并在末尾添加 '\0' 终止符。
 *
 */
static char *BSPLogTrimCommand(char *command) {
  char *first = command;
  char *last;
  while (*first == ' ' || *first == '\t') {
    ++first;
  }
  last = first + strlen(first);
  while (last > first && (last[-1] == ' ' || last[-1] == '\t')) {
    --last;
    *last = '\0';
  }
  return first;
}

/** @brief 解析接收到的日志等级命令，根据解析结果设置日志等级
 *
 * @param[in] command 接收到的日志等级命令，
 * @param[out] level The parsed log level.
 * @return  日志解析结结果，具体取值如下。
 * @retval OK 解析成功，成功设置日志等级。
 * @retval ARG_ERR 解析失败，日志等级无效。
 * @throw None.
 * @note 日志等级命令格式为 `log level <name>`，其中 `<name>`
 * 为日志等级名称（TRACE、DEBUG、INFO、WARN、ERROR、FATAL）。
 */
static err_t BSPLogParseLevelCommand(const char *command,
                                     bsp_log_level_t *level) {
  static const char *const names[] = {"TRACE", "DEBUG", "INFO",
                                      "WARN",  "ERROR", "FATAL"};
  const char *value;
  size_t index;

  /* 判断命令格式是否符合log level */
  if (!BSPLogMatchIgnoreCase(command, "log level", false) ||
      (command[9] != ' ' && command[9] != '\t')) {
    return ARG_ERR;
  }
  value = command + 9;
  while (*value == ' ' || *value == '\t') {
    ++value;
  }

  for (index = 0u; index < ARRAY_LEN(names); ++index) {
    if (BSPLogMatchIgnoreCase(value, names[index], true)) {
      *level = (bsp_log_level_t)index;
      return OK;
    }
  }

  return ARG_ERR;
}

/**
 * @brief 解析上位机
 *
 * Terminates the buffered command, trims surrounding whitespace, parses the
 * `log level <name>` form, and applies the resulting log level. The buffered
 * command length is cleared before the function returns.
 *
 * @return The command result. Returns `OK` when the parsed level is applied or
 *         `ARG_ERR` when the command is invalid.
 * @throws None.
 * @note The function consumes the command currently stored in
 *       `level_command_buffer` and resets `level_command_size` even after a
 *       parse failure.
 * @warning The caller serializes access to the shared command buffer state.
 * @since 1.0.1.
 * @ingroup bsp_log.
 */
static err_t BSPLogApplyLevelCommand(void) {
  bsp_log_level_t level;
  char *command;
  err_t result;

  level_command_buffer[level_command_size] = '\0';
  command = BSPLogTrimCommand(level_command_buffer);
  result = BSPLogParseLevelCommand(command, &level);
  level_command_size = 0u;
  if (result != OK) {
    return BSPLogRecordResult(ARG_ERR);
  }
  return BSPLogSetLevel(level);
}

#endif /* BSP_LOG_ENABLED */
