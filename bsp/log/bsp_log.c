#include "bsp_log.h"

#include <inttypes.h>
#include <math.h>
#include <stdarg.h>
#include <stdatomic.h>
#include <stdbool.h>
#include <stdio.h>

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
static err_t BSPLogTerminalSend(const bsp_log_event_t *event, va_list *args);
#endif

/* ==================== 公共接口：初始化与日志输出 ==================== */

err_t BSPLogInit(void) {
#if !BSP_LOG_ENABLED
  return BSPLogRecordResult(NOT_SUPPORT);
#else
  err_t result = OK;

  if (!BSPLogInThreadMode() ||
      xTaskGetSchedulerState() != taskSCHEDULER_NOT_STARTED) {
    return BSPLogRecordResult(STATE_ERR);
  }
  if (log_initialized) {
    return BSPLogRecordResult(OK);
  }

  SEGGER_RTT_Init();

  if (SEGGER_RTT_SetFlagsUpBuffer(BSP_LOG_CHANNEL_TERMINAL,
                                  SEGGER_RTT_MODE_NO_BLOCK_SKIP) < 0) {
    return BSPLogRecordResult(INIT_ERR);
  }
  result = (SEGGER_RTT_ConfigUpBuffer(BSP_LOG_CHANNEL_DATA, "JScope_t4f4f4f4",
                                      data_buffer, sizeof(data_buffer),
                                      SEGGER_RTT_MODE_NO_BLOCK_SKIP) < 0)
               ? INIT_ERR
               : OK;
  if (result != OK) {
    return BSPLogRecordResult(INIT_ERR);
  }
  result = (SEGGER_RTT_ConfigUpBuffer(BSP_LOG_CHANNEL_RESERVED, "Reserved",
                                      reserved_buffer, sizeof(reserved_buffer),
                                      SEGGER_RTT_MODE_NO_BLOCK_SKIP) < 0)
               ? INIT_ERR
               : OK;
  if (result != OK) {
    return BSPLogRecordResult(INIT_ERR);
  }
  log_mutex = xSemaphoreCreateMutexStatic(&log_mutex_storage);
  if (log_mutex == NULL) {
    return BSPLogRecordResult(INIT_ERR);
  }
  /* 所有通道配置成功后，原子发布默认等级和可用状态。 */
  atomic_store_explicit(&current_level, BSP_LOG_DEFAULT_LEVEL,
                        memory_order_release);
  log_initialized = true;

  return BSPLogRecordResult(result);
#endif
}

err_t BSPLogWrite(bsp_log_level_t level, const char *tag, const char *format,
                  ...) {
#if !BSP_LOG_ENABLED
  /* 日志关闭时，直接调用接口仍返回明确状态；LOG_* 宏则完全不求值参数。 */
  RM_UNUSED(level);
  RM_UNUSED(tag);
  RM_UNUSED(format);
  return BSPLogRecordResult(NOT_SUPPORT);
#else
  const bsp_log_event_t event = {
      .level = level,
      .tag = tag,
      .format = format,
  };
  va_list args;
  err_t result;
  err_t unlock_result;

  if (BSPLogValidateLevel(level) != OK) {
    return BSPLogRecordResult(ARG_ERR);
  }
  if (tag == NULL || format == NULL) {
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

  /* 正文可变参数只建立一次，所有输出结果都先清理参数列表，再释放锁。 */
  va_start(args, format);
  result = BSPLogTerminalSend(&event, &args);
  va_end(args);
  unlock_result = BSPLogUnlock();
  return BSPLogRecordResult(unlock_result != OK ? unlock_result : result);
#endif
}

err_t BSPLogClear(void) {
#if !BSP_LOG_ENABLED
  return BSPLogRecordResult(NOT_SUPPORT);
#else
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
#endif
}

/* ==================== 公共接口：等级控制 ==================== */

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
  /** @brief 缩放取整结果的边界，允许范围为 [-2^63, 2^63)。
   * @note 使用精确的二进制常量，避免 INT64_MAX 转为 double 后向上舍入。
   */
  static const double scaled_integer_limit = 0x1p63;
  double scaled_rounded; /**< 按 FRACTION_SCALE 缩放并取整后的有符号值。 */
  uint64_t
      scaled_magnitude;  /**< 缩放取整结果的绝对值，单位为 1/FRACTION_SCALE。 */
  uint64_t integer_part; /**< 拆分得到的整数部分，尚未按十进制分组。 */
  uint32_t
      fraction_part; /**< 小数部分的整数编码，范围为 [0, FRACTION_SCALE)。 */
  const char *sign;  /**< 负值输出 "-"；非负值及取整后的零输出空串。 */
  int result; /**< snprintf 所需字符数（不含 NUL）；负值表示格式化失败。 */

  if (str == NULL || size == 0u) {
    return -1;
  }
  str[0] = '\0';
  if (!isfinite(va)) {
    return -1;
  }

  /* 先缩放取整（中点远离零），再检查转换范围。 */
  scaled_rounded = round((double)va * FRACTION_SCALE);
  if (scaled_rounded < -scaled_integer_limit ||
      scaled_rounded >= scaled_integer_limit) {
    return -1;
  }

  scaled_magnitude = (uint64_t)fabs(scaled_rounded);
  integer_part = scaled_magnitude / FRACTION_SCALE;
  fraction_part = (uint32_t)(scaled_magnitude % FRACTION_SCALE);
  sign = scaled_rounded < 0.0 ? "-" : ""; /* 取整为零时统一输出正零。 */

  /* 分组输出 32 位整数，兼容不支持 long long 的 newlib-nano。 */
  if (integer_part < INTEGER_GROUP_BASE) {
    result = snprintf(str, size, "%s%" PRIu32 ".%0*" PRIu32, sign,
                      (uint32_t)integer_part, FRACTION_DIGITS, fraction_part);
  } else {
    result = snprintf(str, size, "%s%" PRIu32 "%0*" PRIu32 ".%0*" PRIu32, sign,
                      (uint32_t)(integer_part / INTEGER_GROUP_BASE),
                      INTEGER_GROUP_DIGITS,
                      (uint32_t)(integer_part % INTEGER_GROUP_BASE),
                      FRACTION_DIGITS, fraction_part);
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
 * @brief 按标签和颜色编译开关，使用 RTT 原生格式化接口发送日志事件。
 * @param[in] event 仅在本次调用期间有效的日志元数据。
 * @param[in,out] args 借用的正文参数列表；本回调消耗它，由调用者执行 va_end。
 * @return OK 表示整条记录发送成功；任一发送步骤失败返回 NO_BUFF。
 * @note 调用者已完成参数及上下文检查，并持有日志互斥锁；入口负责记录结果。
 *       始终输出 [LEVEL]；BSP_LOG_TAG_ENABLED 非零时追加 [tag]。
 *       BSP_LOG_COLOR_ENABLED 非零时按等级着色，并在 CRLF 前发送颜色复位序列。
 *       前缀失败时跳过正文；无论前缀或正文是否成功，均尝试发送行尾。
 *       RTT 空间不足时可能已发送部分记录，颜色复位及换行也可能失败。
 */
static err_t BSPLogTerminalSend(const bsp_log_event_t *event, va_list *args) {
#if BSP_LOG_COLOR_ENABLED
  static const char *const colors[BSP_LOG_LEVEL_COUNT] = {
      RTT_CTRL_TEXT_WHITE,  RTT_CTRL_TEXT_CYAN, RTT_CTRL_TEXT_GREEN,
      RTT_CTRL_TEXT_YELLOW, RTT_CTRL_TEXT_RED,  RTT_CTRL_TEXT_BRIGHT_RED};
  const char *color = colors[event->level];
  static const char line_end[] = RTT_CTRL_RESET "\r\n";
#else
  const char *color = "";
  static const char line_end[] = "\r\n";
#endif
  int written;
  err_t end_result;

#if BSP_LOG_TAG_ENABLED
  written = SEGGER_RTT_printf(BSP_LOG_CHANNEL_TERMINAL, "%s[%s][%s] ",
                              color, BSPLogLevelName(event->level), event->tag);
#else
  written = SEGGER_RTT_printf(BSP_LOG_CHANNEL_TERMINAL, "%s[%s] ", color,
                              BSPLogLevelName(event->level));
#endif
  if (written >= 0) {
    written = SEGGER_RTT_vprintf(BSP_LOG_CHANNEL_TERMINAL, event->format, args);
  }
  /* 前缀或正文失败时也尝试复位颜色，避免后续终端输出沿用当前等级颜色。 */
  end_result = BSPLogWriteRaw(line_end, sizeof(line_end) - 1u);
  return written < 0 ? NO_BUFF : end_result;
}

#endif /* BSP_LOG_ENABLED */
