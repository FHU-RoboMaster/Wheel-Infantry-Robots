# bsp_log

`bsp_log` 是基于 SEGGER RTT 的并发安全日志库。日志使用通道 0 输出，调用者传入字符串 `tag` 作为显示标签；tag 不注册、不复制，也不参与等级配置。

## 初始化

在调度器启动前调用一次：

```c
BSPLogInit();
osKernelInitialize();
MX_FREERTOS_Init();
osKernelStart();
```

`BSPLogInit()` 初始化 RTT，将终端通道 0 显式设为 `SEGGER_RTT_MODE_NO_BLOCK_SKIP`，配置数据通道和 Reserved 通道，并把全局等级设为 `BSP_LOG_DEFAULT_LEVEL`（默认 `INFO`）。日志层创建一个静态 FreeRTOS 互斥锁，任务发送期间使用，不分配堆内存。初始化接口标记为 `NO_THREAD_SAFE_PROMISE`，只能由调度器启动前的单个线程调用；ISR 或调度器启动后调用返回 `STATE_ERR`。成功后重复初始化直接返回成功，不重置 RTT 中已有的数据或运行时等级；初始化失败可以在启动阶段重试。

通道 0 的默认容量在 `SEGGER/Config/SEGGER_RTT_Conf.h` 中设为 4096 字节，比原来的
1024 字节增加 3072 字节静态 RAM。仍采用非阻塞丢弃模式，不自动重发，也没有新增故障
输出通道；主机应持续读取 RTT 上行通道 0。扩容降低突发日志丢失概率，不保证无限缓存。
`main.c` 将初始化返回值保存在全局 `bsp_log_init_result`；调试器可直接查看，避免后续日志
覆盖初始化状态。首个断言及其日志返回值另保存在 `comp_utils.h` 声明的 `verify_failure`，
详情见 `component/comp_utils.md`。

## 等级和过滤

等级顺序为：

```text
TRACE < DEBUG < INFO < WARN < ERROR < FATAL
```

默认全局等级为 `INFO`，可以运行时修改：

```c
BSPLogSetLevel(BSP_LOG_LEVEL_DEBUG);
```

工程日志按用途分级：

- `INFO`：每个任务的一条就绪提示、运行模式切换、通信恢复等有意义的状态变化。
- `DEBUG`：UART RX/TX 初始化、DMA 启动/停止、CAN 过滤器/订阅注册、GPIO/PWM/IIC/USB
  配置成功、分步初始化及单发角度等调试细节。默认不显示，需要排查时发送
  `log level DEBUG`（以换行结束）；恢复精简显示时发送 `log level INFO`。
- `WARN` / `ERROR` / `FATAL`：保留现有异常、失败和严重故障记录。

例如 `RX initialized UART...`、`RX DMA started UART...` 不再占用默认 INFO 输出。
单发完成的角度误差先经 `Float2StrN()` 转为字符串，再用 `%s` 输出，适配 RTT 原生格式。

BSP 日志正文和参数标签统一使用中文，按“设备、操作结果、关键参数”组织，例如：

```text
[WARN][CAN] CAN2 发送失败 帧ID=0x200 错误码=-15 TSR=0x82000008 ESR=0x00800033 最近错误LEC=3 发送错误计数TEC=128
[INFO][CAN] CAN2 发送恢复正常
[DEBUG][UART] 接收DMA启动完成 串口逻辑编号=5 缓冲区=160字节
```

`INFO/WARN/ERROR` 等等级、模块标签和寄存器缩写保留，方便筛选及对照手册。
日志中的串口/I2C逻辑编号是 BSP 枚举值，不等同于硬件外设名称；长度明确标注字节，
DWT耗时标注毫秒。源码和日志文本采用 UTF-8，终端应使用 UTF-8 显示。

低于全局等级的日志在格式化前直接返回 `PENDING`，不会执行格式化或写入 RTT。这是正常的过滤结果，不会更新当前任务的最后错误。这里的 `PENDING` 表示本次日志跳过，不会加入队列或稍后补发。

```c
err_t result =
    BSPLogWrite(BSP_LOG_LEVEL_DEBUG, "motor", "speed=%d", speed);
if (result == PENDING) {
  // 日志被当前等级正常过滤
}
```

## 输出接口

```c
err_t BSPLogWrite(bsp_log_level_t level,
                  const char *tag,
                  const char *format,
                  ...);
```

示例：

```c
LOG_INFO("motor", "speed=%d", speed);
LOG_ERROR("can", "send failed: %d", status);
```

六个快捷宏采用以下形式，现有 `LOG_INFO("motor", "speed=%d", speed)` 调用无需修改：

```c
#define LOG_TRACE(...) \
  BSPLogWrite(BSP_LOG_LEVEL_TRACE, __VA_ARGS__)
```

输出格式为：

```text
[INFO][motor] speed=1200\r\n
[ERROR][can] send failed: -15\r\n
```

`tag` 和 `format` 不能为 `NULL`，否则返回 `PTR_NULL`。允许使用空字符串 tag。

## 返回状态

日志接口直接复用 `component/comp_cmd.h` 中的公共 `err_t`，不再定义日志专用错误枚举或旧名称别名。实际使用的状态如下：

| 状态 | 数值 | 日志接口中的含义 |
| --- | --- | --- |
| `PENDING` | 1 | 等级过滤，正常跳过，不更新最后错误 |
| `OK` | 0 | 操作成功；写日志时表示整条记录已写入 RTT |
| `INIT_ERR` | -2 | 尚未初始化、RTT 通道配置或静态互斥锁创建失败 |
| `ARG_ERR` | -3 | 日志等级非法 |
| `STATE_ERR` | -4 | 调用上下文非法，或释放日志互斥锁失败 |
| `NOT_SUPPORT` | -7 | 编译时关闭日志后，直接调用初始化、输出或清屏接口 |
| `NO_BUFF` | -11 | RTT 空间不足，可能已写入部分记录 |
| `BUSY` | -15 | 日志互斥锁忙，当前记录或清屏序列未输出 |
| `PTR_NULL` | -16 | 标签、格式串或等级输出指针为空 |

RTT 写入不等待，因此不会返回 `TIMEOUT`。日志关闭时 `LOG_*` 宏仍为 `((void)0)`，不求值参数；等级设置、等级查询和最后错误查询接口仍可使用。

## 原生 RTT 格式化与并发规则

`BSPLogWrite()` 检查参数、初始化、等级及调用上下文后，将日志事件交给内部输出回调。回调使用 `SEGGER_RTT_printf()` 输出等级和标签，用 `SEGGER_RTT_vprintf()` 输出正文，最后通过 `SEGGER_RTT_Write()` 输出 CRLF。`SEGGER_RTT_Write()` 只复制字节，不进行格式化；日志层不再调用 `snprintf/vsnprintf` 拼接记录，也不再持有 512 字节行缓冲区。

六个快捷宏只补充固定日志等级；直接调用 `BSPLogWrite()` 时提供等级、标签、格式串及格式化参数。支持 RTT 原生的 `%d`、`%u`、`%x/%X`、`%c`、`%s`、`%p` 和 `%%`，以及其支持的宽度、精度和标志。原生实现会跳过 `l/h`，仍按 32 位整数取参数，不能替代标准 printf 的长度修饰符语义。整数日志使用匹配的 `int/unsigned` 参数；不支持 `%f`、`%e`、`%g`、`%z` 或 64 位整数格式。

浮点日志先调用 `Float2StrN()`，再以 `%s` 输出；项目内 PWM、VOFA、电机故障日志已按此方式转换，保留三位小数，转换失败显示 `<invalid>`。DWT 计时日志改为三位小数的毫秒，计时变量仍为秒。关闭日志时，这些转换参数也不会求值。

统一保留 `BSPLogWrite()` 一个日志入口。它在检查通过且拿到锁后使用 `va_start()` 建立唯一的正文参数列表，交给输出回调中的 `SEGGER_RTT_vprintf()`，回调返回后执行 `va_end()`；事件中不再保存参数列表，也不再使用 `va_copy()`。事件和借用字符串仅在当前同步调用内有效。

C 的 `...` 无法直接转发到另一个 `printf(...)`，因此正文仍需调用接收 `va_list` 的 `SEGGER_RTT_vprintf()`。`SEGGER_RTT_printf(channel, format, args)` 会把 `args` 当作一个普通参数，不能展开已有参数列表；原生 `SEGGER_RTT_printf()` 本身也是创建参数列表后调用 `vprintf()`。

RTT 原生格式化使用内部 64 字节缓冲区，长正文会分段写入，不再有日志层 511 字节上限。通道 0 保持 `SEGGER_RTT_MODE_NO_BLOCK_SKIP`，每次分段复制不等待主机；空间不足返回 `NO_BUFF`，但前面的分段可能已经发出，不能保证整条记录要么全部写入、要么全部跳过。本项目同时修正原生 `vprintf` 的末段写入失败检查及末段字节重复计数，以保证失败和成功字节数可被调用者准确识别。

任务阶段使用一个静态 FreeRTOS 互斥锁，覆盖前缀、正文及换行，避免不同日志任务的记录交错；清屏也使用同一把锁。`xSemaphoreTake(log_mutex, 0)` 只立即尝试一次，锁忙就返回 `BUSY`，不输出、不排队、不等待重试。RTT 的内部锁只保护每次传输复制，不覆盖整条记录。直接调用 RTT 的其他输出者不受日志互斥锁保护。

写入完成或传输失败后都会检查 `xSemaphoreGive()` 的返回值。释放日志互斥锁失败时，接口和当前任务的最后错误均为 `STATE_ERR`，优先于同时发生的传输错误；释放成功则返回原传输结果。释放失败之前可能已输出日志或清屏序列，该错误不代表内容未发送。

启动阶段单线程输出不获取互斥锁。ISR、中断屏蔽、BASEPRI 临界区及调度器挂起期间的输出返回 `STATE_ERR`。日志本身不申请堆内存；`Float2StrN()` 仍使用整数 `snprintf()`，既有的 newlib 任务状态及内存分配锁配置保留。

## 每任务错误状态

TLS（任务本地存储）已直接接入日志状态保存和查询。`Core/Inc/FreeRTOSConfig.h` 的用户配置区统一定义槽位编号与槽位数量：

```c
#define configBSP_LOG_TLS_ERROR_INDEX 0
#define configNUM_THREAD_LOCAL_STORAGE_POINTERS 1
```

默认每个任务的槽位 0 专供日志使用；数量必须大于编号。缺少编号配置、编号为负或槽位数量不足时，`bsp_log.c` 会在编译阶段明确报错。其他模块需要 TLS 时应分配不同编号并增加总数量，不能复用日志槽位。

即使编译时关闭日志输出，等级设置和状态查询接口仍保留任务本地状态，因此仍需保留这两项 TLS 配置。

FreeRTOS 创建任务时自动把槽位置为 NULL，对应 `OK`；任务函数无需初始化，无需额外 malloc，也无需注册清理回调。日志只把错误码编码到该槽位中，不解引用其指针值。任务 A 和任务 B 的错误状态互不覆盖：

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

例如任务 A 的日志返回 `NO_BUFF`，任务 B 随后成功输出日志时，只会清除 B 自己的状态；A 调用 `BSPLogGetLastError()` 仍得到 `NO_BUFF`。A 自己下一次成功的状态更新会覆盖该错误，因此这个接口保存最近一次状态，不保存错误历史。启动阶段的状态也不会被新建任务继承。

## 清屏和工具接口

```c
err_t BSPLogClear(void);
err_t BSPLogSetLevel(bsp_log_level_t level);
err_t BSPLogGetLevel(bsp_log_level_t *level);
err_t BSPLogGetLastError(void);
```

日志库通过 `BSPLogPollLevelCommand()` 调用非阻塞 `SEGGER_RTT_GetKey()`，逐字节排空 RTT 下行通道 0；无数据时立即结束轮询，不使用阻塞的 `WaitKey()`。上位机发送 `log level <name>`，例如 `log level DEBUG\n`，其中等级名称为 `TRACE`、`DEBUG`、`INFO`、`WARN`、`ERROR` 或 `FATAL`。命令不区分大小写，首尾空格和制表符会被去除，CR/LF 均可提交命令；空行忽略，半条命令保留至下次轮询。

命令缓冲区为 32 字节，最多接受 31 字节文本并预留 NUL。长度达到缓冲区容量时作为超长标记，后续字节丢弃至 CR/LF，再返回 `ARG_ERR` 并恢复接收。一次轮询处理多条命令时，返回最后一条完整命令的结果；没有完整命令则返回 `PENDING`，保留当前任务的错误状态。默认任务每 10 ms 调用一次轮询接口，等级仅保存在 RAM，重启后恢复默认值。

`Float2StrN()` 仍然是独立的浮点字符串工具，不参与日志等级、并发锁或错误状态。其返回值表示字符长度，因此保留 `int` 类型：失败返回 -1，成功返回完整结果所需字符数，不含结束符；返回值大于等于容量表示发生截断。

内部使用 `round()` 将数值量化到 0.001，再由整数格式的 `snprintf()` 输出，复用标准库的数字转换、长度计算和截断处理。半整数向远离零的方向取整，负零和取整后为零的小负数输出 `0.000`；NaN、无穷大以及量化后超出 `[-2^63, 2^63)` 的数值返回 -1。调用上下文需满足 libc 的可重入要求。

项目使用的 newlib-nano 未启用 `long long` 格式支持，因此整数部分按十亿拆分为两个 32 位段，使用 `PRIu32` 输出，兼容大数值且无需手工逐位转换。
