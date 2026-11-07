# bsp_log

`bsp_log` 是基于 SEGGER RTT 的并发安全日志库。日志使用通道 0 输出，快捷宏自动传入 `__FILE__`、`__LINE__`，调用者传入字符串 `tag` 作为显示标签；tag 不注册、不复制，也不参与等级配置。

## 初始化

在调度器启动前调用一次：

```c
BSPLogInit();
osKernelInitialize();
MX_FREERTOS_Init();
osKernelStart();
```

`BSPLogInit()` 初始化 RTT，将终端通道 0 显式设为 `SEGGER_RTT_MODE_NO_BLOCK_SKIP`，配置数据通道和 Reserved 通道，并把全局等级设为 `BSP_LOG_DEFAULT_LEVEL`（默认 `INFO`）。日志层创建一个静态 FreeRTOS 互斥锁，任务发送期间使用，不分配堆内存。初始化接口标记为 `NO_THREAD_SAFE_PROMISE`，只能由调度器启动前的单个线程调用；ISR 或调度器启动后调用返回 `STATE_ERR`。成功后重复初始化直接返回成功，不重置 RTT 中已有的数据或运行时等级；初始化失败可以在启动阶段重试。

## 等级和过滤

等级顺序为：

```text
TRACE < DEBUG < INFO < WARN < ERROR < FATAL
```

默认全局等级为 `INFO`，可以运行时修改：

```c
BSPLogSetLevel(BSP_LOG_LEVEL_DEBUG);
```

低于全局等级的日志在格式化前直接返回 `PENDING`，不会执行格式化或写入 RTT。这是正常的过滤结果，不会更新当前任务的最后错误。这里的 `PENDING` 表示本次日志跳过，不会加入队列或稍后补发。

```c
err_t result =
    BSPLogWrite(BSP_LOG_LEVEL_DEBUG, __FILE__, __LINE__,
                "motor", "speed=%d", speed);
if (result == PENDING) {
  // 日志被当前等级正常过滤
}
```

## 输出接口

```c
err_t BSPLogWrite(bsp_log_level_t level,
                  const char *file, int line,
                  const char *tag,
                  const char *format,
                  ...);

err_t BSPLogVWrite(bsp_log_level_t level,
                   const char *file, int line,
                   const char *tag,
                   const char *format,
                   va_list args);
```

示例：

```c
LOG_INFO("motor", "speed=%d", speed);
LOG_ERROR("can", "send failed: %d", status);
```

六个快捷宏采用以下形式，现有 `LOG_INFO("motor", "speed=%d", speed)` 调用无需修改：

```c
#define LOG_TRACE(...) \
  BSPLogWrite(BSP_LOG_LEVEL_TRACE, __FILE__, __LINE__, __VA_ARGS__)
```

输出格式为（文件名和行号随实际调用位置变化）：

```text
[INFO][motor] motor.c:42: speed=1200\r\n
[ERROR][can] can.c:80: send failed: -15\r\n
```

`file`、`tag` 和 `format` 不能为 `NULL`，否则返回 `PTR_NULL`。允许使用空字符串 tag。

## 返回状态

日志接口直接复用 `component/comp_cmd.h` 中的公共 `err_t`，不再定义日志专用错误枚举或旧名称别名。实际使用的状态如下：

| 状态 | 数值 | 日志接口中的含义 |
| --- | --- | --- |
| `PENDING` | 1 | 等级过滤，正常跳过，不更新最后错误 |
| `OK` | 0 | 操作成功；写日志时表示整条记录已写入 RTT |
| `INIT_ERR` | -2 | 尚未初始化、RTT 通道配置或静态互斥锁创建失败 |
| `ARG_ERR` | -3 | 日志等级非法 |
| `STATE_ERR` | -4 | 初始化或输出的调用上下文非法 |
| `NOT_SUPPORT` | -7 | 编译时关闭日志后，直接调用初始化、输出或清屏接口 |
| `NO_BUFF` | -11 | RTT 空间不足，可能已写入部分记录 |
| `BUSY` | -15 | 获取日志互斥锁失败 |
| `PTR_NULL` | -16 | 源文件名、标签、格式串或等级输出指针为空 |

RTT 写入不等待，因此不会返回 `TIMEOUT`。日志关闭时 `LOG_*` 宏仍为 `((void)0)`，不求值参数；等级设置、等级查询和最后错误查询接口仍可使用。

## 原生 RTT 格式化与并发规则

`BSPLogVWrite()` 检查参数、初始化、等级及调用上下文后，将日志事件交给内部输出回调。回调使用 `SEGGER_RTT_printf()` 输出等级、标签、源文件和行号，用 `SEGGER_RTT_vprintf()` 输出正文，最后通过 `SEGGER_RTT_Write()` 输出 CRLF。`SEGGER_RTT_Write()` 只复制字节，不进行格式化；日志层不再调用 `snprintf/vsnprintf` 拼接记录，也不再持有 512 字节行缓冲区。

六个快捷宏自动捕获调用位置；直接调用 `BSPLogWrite/BSPLogVWrite` 时需要显式提供 `file`、`line`。支持 RTT 原生的 `%d`、`%u`、`%x/%X`、`%c`、`%s`、`%p` 和 `%%`，以及其支持的宽度、精度和标志。原生实现会跳过 `l/h`，仍按 32 位整数取参数，不能替代标准 printf 的长度修饰符语义。整数日志使用匹配的 `int/unsigned` 参数；不支持 `%f`、`%e`、`%g`、`%z` 或 64 位整数格式。

浮点日志先调用 `Float2StrN()`，再以 `%s` 输出；项目内 PWM、VOFA、电机故障日志已按此方式转换，保留三位小数，转换失败显示 `<invalid>`。DWT 计时日志改为三位小数的毫秒，计时变量仍为秒。关闭日志时，这些转换参数也不会求值。

`BSPLogVWrite()` 用 `va_copy/va_end` 为回调管理独立参数列表。事件和借用字符串仅在当前同步调用内有效；调用者可继续使用原始列表，并仍负责对其执行 `va_end()`。

RTT 原生格式化使用内部 64 字节缓冲区，长正文会分段写入，不再有日志层 511 字节上限。通道 0 保持 `SEGGER_RTT_MODE_NO_BLOCK_SKIP`，每次分段复制不等待主机；空间不足返回 `NO_BUFF`，但前面的分段可能已经发出，不能保证整条记录要么全部写入、要么全部跳过。本项目同时修正原生 `vprintf` 的末段写入失败检查及末段字节重复计数，以保证失败和成功字节数可被调用者准确识别。

任务阶段使用一个静态 FreeRTOS 互斥锁，覆盖前缀、正文及换行，避免不同日志任务的记录交错；清屏也使用同一把锁。任务可能等待这把具有优先级继承的锁；RTT 的内部锁只保护每次传输复制，不覆盖整条记录。直接调用 RTT 的其他输出者不受日志互斥锁保护。

启动阶段单线程输出不获取互斥锁。ISR、中断屏蔽、BASEPRI 临界区及调度器挂起期间的输出返回 `STATE_ERR`。日志本身不申请堆内存；`Float2StrN()` 仍使用整数 `snprintf()`，既有的 newlib 任务状态及内存分配锁配置保留。

## 每任务错误状态

FreeRTOS 配置中的 `configNUM_THREAD_LOCAL_STORAGE_POINTERS` 设为 1，槽位 0 专供日志库保存当前任务的最后错误。任务 A 和任务 B 的错误状态互不覆盖：

```c
err_t result = LOG_ERROR("motor", "failed");
if (result < 0 && BSPLogGetLastError() != OK) {
  // 只读取当前任务的错误状态
}
```

规则如下：

- `PENDING` 不更新错误状态。
- 初始化、写入、清屏和设置等级返回 `OK` 时清除当前任务错误；成功查询等级或最后错误不改变错误状态。
- 其他失败状态写入当前任务 TLS。
- 调度器启动前使用独立的启动阶段错误状态。
- ISR 不读写任务 TLS。

## 清屏和工具接口

```c
err_t BSPLogClear(void);
err_t BSPLogSetLevel(bsp_log_level_t level);
err_t BSPLogGetLevel(bsp_log_level_t *level);
err_t BSPLogGetLastError(void);
```

日志库通过 `BSPLogPollLevelCommand()` 轮询 RTT 下行通道 0，读取上位机发送的数据并调用 `BSPLogSetLevel()`。上位机脚本可以直接发送数值字节 `0`~`5`，也可以发送以换行结尾的 `TRACE`、`DEBUG`、`INFO`、`WARN`、`ERROR`、`FATAL`，以及 `level=debug`、`level debug`、`log level debug` 和 `log_level=debug`。文本命令不区分大小写，CR/LF 均可作为结束符；半条命令会等待下一次轮询，超长命令会丢弃到下一个结束符。默认任务每 10 ms 调用一次轮询接口。等级仅保存在 RAM，重启后恢复默认值。

`Float2StrN()` 仍然是独立的浮点字符串工具，不参与日志等级、并发锁或错误状态。其返回值表示字符长度，因此保留 `int` 类型：失败返回 -1，成功返回完整结果所需字符数，不含结束符；返回值大于等于容量表示发生截断。

内部使用 `round()` 将数值量化到 0.001，再由整数格式的 `snprintf()` 输出，复用标准库的数字转换、长度计算和截断处理。半整数向远离零的方向取整，负零和取整后为零的小负数输出 `0.000`；NaN、无穷大以及量化后超出 `[-2^63, 2^63)` 的数值返回 -1。调用上下文需满足 libc 的可重入要求。

项目使用的 newlib-nano 未启用 `long long` 格式支持，因此整数部分按十亿拆分为两个 32 位段，使用 `PRIu32` 输出，兼容大数值且无需手工逐位转换。
