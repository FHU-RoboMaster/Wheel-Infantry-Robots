/**
 * @file bsp/log/bsp_log.h
 * @brief 声明 RTT 分级日志接口和有限浮点数转换接口。
 *
 * @author xiaoshuaijie
 * @date 2026-11-04
 * @version 1.0.1
 * @since 1.0.1
 *@copyright Copyright(c) 2026, xiaoshuaijie
 */

/**
 * @defgroup bsp_log RTT 日志
 * @since 1.0.1
 * @brief 提供带标签的 RTT 记录和任务本地错误查询。
 * @details 通道 0 用于文本，通道 1 用于 JScope，通道 2 用于预留数据。
 *
 * @par 状态保存约定
 * 除查询接口另有说明外，操作结果保存在启动状态或当前任务状态中；OK 清除旧错误，
 * PENDING 保留旧状态。ISR 调用不更新状态，本模块独占配置指定的 FreeRTOS TLS
 * 槽位。
 * @{
 */

#ifndef _BSP_LOG_H
#define _BSP_LOG_H

#include <stddef.h>
#include <stdint.h>

#include "SEGGER_RTT.h"
#include "SEGGER_RTT_Conf.h"
#include "comp_cmd.h"

/* 编译开关与 RTT 通道配置 */

#ifndef BSP_LOG_ENABLED
#define BSP_LOG_ENABLED   \
  0 /**< 编译开关：0 \
       关闭，非零启用；由$<$<CONFIG:Debug>:BSP_LOG_ENABLED>定义。 */
#endif

#define BSP_LOG_CHANNEL_TERMINAL 0u /**< 上行通道：终端日志。 */
#define BSP_LOG_CHANNEL_DATA 1u     /**< 上行通道：JScope 数据。 */
#define BSP_LOG_CHANNEL_RESERVED 2u /**< 上行通道：预留输出。 */
#define BSP_LOG_CHANNEL_COMMAND 0u  /**< 下行通道：日志等级命令。 */

/* 缓冲区容量与默认等级 */

#define BSP_LOG_COMMAND_BUFFER_SIZE \
  32u /**< 命令缓冲区容量（字节，包含 NUL）。 */
#define BSP_LOG_DATA_BUFFER_SIZE \
  1024u /**< 静态 JScope 上行缓冲区容量（字节）。 */
#define BSP_LOG_RESERVED_BUFFER_SIZE \
  256u /**< 静态预留上行缓冲区容量（字节）。 */
#define BSP_LOG_DEFAULT_LEVEL BSP_LOG_LEVEL_INFO /**< 初始最低等级：INFO。 */

/* Cortex-M 上下文判定值 */

#define BSP_LOG_IPSR_THREAD_MODE 0U /**< IPSR：线程模式。 */
#define BSP_LOG_PRIMASK_UNMASKED 0U /**< PRIMASK：未屏蔽中断。 */
#define BSP_LOG_BASEPRI_UNMASKED 0U /**< BASEPRI：无优先级屏蔽。 */

/*float -> string*/
#define FRACTION_DIGITS 3      /**< 小数位数，也是小数部分补零输出的宽度。 */
#define FRACTION_SCALE 1000    /**< 定点缩放系数，等于 10^FRACTION_DIGITS。 */
#define INTEGER_GROUP_DIGITS 9 /**< 整数低位分组补零输出的宽度。 */
#define INTEGER_GROUP_BASE \
  1000000000 /**< 整数分组基数，等于 10^INTEGER_GROUP_DIGITS。 */

/* 日志等级与接口标记 */

/**
 * @brief 按 TRACE（0）至 FATAL（5）排列日志记录等级。
 * @details 为记录和共享最低等级过滤器提供等级定义；COUNT 是哨兵值。
 */

typedef enum {
  BSP_LOG_LEVEL_TRACE = 0, /**< 跟踪（0）。 */
  BSP_LOG_LEVEL_DEBUG,     /**< 调试（1）。 */
  BSP_LOG_LEVEL_INFO,      /**< 信息（2）。 */
  BSP_LOG_LEVEL_WARN,      /**< 警告（3）。 */
  BSP_LOG_LEVEL_ERROR,     /**< 错误（4）。 */
  BSP_LOG_LEVEL_FATAL,     /**< 致命（5），不会停止运行。 */
  BSP_LOG_LEVEL_COUNT      /**< 等级数量，不是有效日志等级。 */
} bsp_log_level_t;

/**
 * @brief 固定小数输出的精度、缩放系数及整数分组参数。
 * @details 缩放系数等于 10 的小数位数次方，分组基数等于 10 的分组位数次方。
 *          分组后分别使用 uint32_t 输出，兼容 newlib-nano 的整数格式化。
 * @note 修改位数时必须同步调整对应的缩放系数或分组基数。
 */

/* 初始化与日志输出 */

/**
 * @brief 在调度器启动前初始化 RTT 终端、数据及预留通道。
 *
 * @return 初始化状态，具体取值如下。
 * @retval OK 初始化成功或重复成功初始化。
 * @retval STATE_ERR 不在启动阶段线程上下文。
 * @retval INIT_ERR RTT 配置或静态互斥锁创建失败。
 * @retval NOT_SUPPORT 日志已关闭。
 * @note 将终端设置为非阻塞分段跳过模式，创建静态日志互斥锁并设置等级为 INFO。
 *       重复成功调用会保留缓冲数据和已配置等级。
 *       初始化失败时可在调度器启动前重试。
 *       结果写入启动状态或任务状态；ISR 结果不会更新状态。
 * @warning 要求在调度器启动前调用此函数完成初始化。
 */
err_t BSPLogInit(void);

/**
 * @brief 按指定等级格式化并提交带标签的日志记录。
 *
 * @param[in] level 日志等级，范围为 TRACE（0）至 FATAL（5）。
 * @param[in] file 借用的非空源文件名，通常由宏传入 __FILE__。
 * @param[in] line 源代码行号，通常由宏传入 __LINE__。
 * @param[in] tag 借用的非空、NUL 结尾标签；允许为空串，在调用期间有效。
 * @param[in] format 借用的非空 RTT 原生格式串，在调用期间有效。
 * @param[in] ... 按 format 要求的顺序和类型提供格式化参数。
 * @return 日志提交状态，具体取值如下。
 * @retval OK 记录提交成功。
 * @retval PENDING 记录被等级过滤。
 * @retval ARG_ERR 日志等级非法。
 * @retval PTR_NULL file、tag 或 format 为空。
 * @retval INIT_ERR 日志尚未初始化。
 * @retval STATE_ERR 上下文被拒绝或释放日志互斥锁失败。
 * @retval BUSY 日志互斥锁忙，本条记录跳过且未输出。
 * @retval NO_BUFF RTT 空间不足。
 * @retval NOT_SUPPORT 日志已关闭。
 * @note 通过日志事件调用 RTT printf/vprintf，不再使用日志层行缓冲区。
 *       函数内部仅维护一份正文参数列表，在输出结束后执行 va_end。
 *       记录格式为“[LEVEL][tag] file:line: 正文”，末尾为 CRLF。
 *       任务阶段用静态互斥锁串行化前缀、正文和换行；启动阶段不获取互斥锁。
 *       获取锁不等待；释放失败优先返回 STATE_ERR，即使传输也发生错误。
 *       过滤在参数和初始化检查之后、上下文检查之前执行。
 *       PENDING 直接跳过记录，不入队且不改变已保存错误状态。
 *       其他结果更新启动状态或当前任务状态；ISR 结果不会更新状态。
 * @warning 未被过滤的写入拒绝 ISR、中断屏蔽和调度器挂起上下文。
 *          原生 RTT 格式支持 d/u/x/X/c/s/p/%%，不支持浮点和标准长度修饰符语义。
 *          浮点数应先用 Float2StrN() 转换，再通过 %s 输出。
 *          RTT 写入和日志加锁均不等待；NO_BUFF
 * 或释放锁失败时可能已输出部分记录。 初始化后通道 0 必须保持
 * SEGGER_RTT_MODE_NO_BLOCK_SKIP 模式。
 */
err_t BSPLogWrite(bsp_log_level_t level, const char* file, int line,
                  const char* tag, const char* format, ...);

/* 终端控制 */

/**
 * @brief 通过 RTT 通道 0 提交终端清屏控制序列。
 *
 * @return 控制序列提交状态，具体取值如下。
 * @retval OK 清屏序列提交成功。
 * @retval INIT_ERR 日志尚未初始化。
 * @retval STATE_ERR 上下文被拒绝或释放日志互斥锁失败。
 * @retval NO_BUFF RTT 空间不足。
 * @retval BUSY 日志互斥锁忙，清屏序列未输出。
 * @retval NOT_SUPPORT 日志已关闭。
 * @note 写入两个空格和 RTT_CTRL_CLEAR，不发送末尾 NUL。
 *       控制序列由主机终端解释，不丢弃 RTT 缓冲数据。
 *       结果写入启动状态或任务状态；ISR 结果不会更新状态。
 *       获取锁不等待；释放失败优先返回 STATE_ERR，即使传输也发生错误。
 * @warning 拒绝 ISR、中断屏蔽和调度器挂起上下文；通道 0 必须保持
 *          SEGGER_RTT_MODE_NO_BLOCK_SKIP 模式。
 */
err_t BSPLogClear(void);

/* 等级控制与状态查询 */

/**
 * @brief 设置后续日志记录使用的共享最低等级。
 *
 * @param[in] level 最低等级，范围为 TRACE（0）至 FATAL（5）。
 * @return 等级设置状态。
 * @retval OK 等级更新成功。
 * @retval ARG_ERR 等级超出范围。
 * @note 使用原子写入，即使关闭日志也可配置；非法输入保留原等级。
 */
err_t BSPLogSetLevel(bsp_log_level_t level);

/**
 * @brief 将共享最低等级读取到调用方提供的存储位置。
 *
 * @param[out] level 借用的非空输出指针，接收 TRACE 至 FATAL 范围内的等级。
 * @return 等级读取状态。
 * @retval OK 读取成功。
 * @retval PTR_NULL 输出指针为空。
 * @note 使用原子读取，即使关闭日志也可查询。成功读取保留已保存错误；
 *       除 ISR 外，空指针错误会更新已保存状态。
 */
err_t BSPLogGetLevel(bsp_log_level_t* level);

/**
 * @brief 轮询 RTT 下行通道 0 并应用完整的日志等级命令。
 *
 * @return 命令处理状态，具体取值如下。
 * @retval OK 本次最后一条完整命令设置成功。
 * @retval PENDING 没有完整命令可用。
 * @retval ARG_ERR 本次最后一条完整命令非法或超长。
 * @retval STATE_ERR 不在任务上下文。
 * @retval INIT_ERR 尚未调用 BSPLogInit()。
 * @retval NOT_SUPPORT 日志已关闭。
 * @note 使用非阻塞 SEGGER_RTT_GetKey() 排空下行通道 0。
 *       文本格式为 `log level <name>`，不区分大小写，以 CR 或 LF 结束。
 *       不完整输入保留到下次调用；超过 31 字节的命令丢弃至下一个结束符。
 *       一次处理多条命令时返回最后一条完整命令的结果；空行忽略。
 * @warning 应在 BSPLogInit() 后由单个线程周期调用。
 */
err_t BSPLogPollLevelCommand(void);

/**
 * @brief 读取已保存的启动阶段或当前任务日志状态，不修改该状态。
 *
 * @return 线程模式下返回已保存的 err_t 状态；ISR 中返回 STATE_ERR。
 * @note 调度器启动前读取启动状态，启动后读取当前任务的 TLS 槽位。
 *       新任务初始状态为 OK；被过滤记录保留已保存状态。ISR 查询不访问 TLS。
 *       槽位由 FreeRTOSConfig.h 的 configBSP_LOG_TLS_ERROR_INDEX 配置，默认是
 * 0。
 * @warning 该槽位由本模块独占；configNUM_THREAD_LOCAL_STORAGE_POINTERS
 * 必须大于槽位编号。
 */
err_t BSPLogGetLastError(void);

/**
 * @name 日志快捷宏
 * @brief 使用固定等级及调用位置的 __FILE__、__LINE__ 调用 BSPLogWrite()。
 *
 * @param[in] ... 首参数为非 NULL、NUL 结尾的 tag，允许空串；第二个参数为
 * 非 NULL 的 RTT 原生格式串，后续参数须与格式串匹配。启用时返回
 * BSPLogWrite() 的结果；关闭时展开为 ((void)0)。
 * @note 启用时每个参数求值一次，即使记录随后被等级过滤。
 *       关闭时参数不求值，不输出日志，也不更新已保存状态。
 *       需要始终获取返回状态时，请直接调用 BSPLogWrite()。
 * @warning 启用时遵守 BSPLogWrite() 的上下文、栈空间及格式要求。
 * @{
 */
#if BSP_LOG_ENABLED
/** @brief 提交 TRACE 记录；详细信息。 */
#define LOG_TRACE(...) \
  BSPLogWrite(BSP_LOG_LEVEL_TRACE, __FILE__, __LINE__, __VA_ARGS__)

/** @brief 提交 DEBUG 记录；调试信息。 */
#define LOG_DEBUG(...) \
  BSPLogWrite(BSP_LOG_LEVEL_DEBUG, __FILE__, __LINE__, __VA_ARGS__)

/** @brief 提交 INFO 记录；正常运行信息。 */
#define LOG_INFO(...) \
  BSPLogWrite(BSP_LOG_LEVEL_INFO, __FILE__, __LINE__, __VA_ARGS__)

/** @brief 提交 WARN 记录；警告信息。 */
#define LOG_WARN(...) \
  BSPLogWrite(BSP_LOG_LEVEL_WARN, __FILE__, __LINE__, __VA_ARGS__)

/** @brief 提交 ERROR 记录；错误信息。 */
#define LOG_ERROR(...) \
  BSPLogWrite(BSP_LOG_LEVEL_ERROR, __FILE__, __LINE__, __VA_ARGS__)

/** @brief 提交 FATAL 记录；严重错误。 */
#define LOG_FATAL(...) \
  BSPLogWrite(BSP_LOG_LEVEL_FATAL, __FILE__, __LINE__, __VA_ARGS__)
#else
#define LOG_TRACE(...) ((void)0)
#define LOG_DEBUG(...) ((void)0)
#define LOG_INFO(...) ((void)0)
#define LOG_WARN(...) ((void)0)
#define LOG_ERROR(...) ((void)0)
#define LOG_FATAL(...) ((void)0)
#endif

/** @} */

/* 数值转换（独立于日志开关及错误状态） */

/**
 * @brief 将有限浮点数转换为固定三位小数的字符串。
 *
 * @param[out] str 借用的非空调用方缓冲区，最多接收 size 字节（包括 NUL）。
 * @param[in] size 缓冲区容量，单位为字节，至少为 1，包括 NUL 结束符空间。
 * @param[in] va 有限输入值，取整后的 va * 1000 位于 [-2^63, 2^63) 内。
 * @return 成功时返回完整结果字符数（不含 NUL）；返回值大于等于 size 表示截断。
 *         str 为 NULL、size 为 0、输入非有限或越界、snprintf 失败时返回 -1。
 * @note 以 0.001 精度取整，中点向远离零方向舍入，取整后的零输出为 0.000。
 *       size 大于 0 且 str 非 NULL 时，即使失败，缓冲区也以 NUL 结尾。
 *       整数部分按 32 位十进制分组以支持
 * newlib-nano；不读取或修改日志错误状态。
 * @warning 要求 str 指向至少 size 字节的可写缓冲区，调用上下文满足 libc
 *          格式化要求。
 */
int Float2StrN(char* str, size_t size, float va);

/** @} */

#endif /* _BSP_LOG_H */
