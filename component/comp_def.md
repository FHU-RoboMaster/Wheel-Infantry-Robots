# comp_def

组件通用定义(仅头文件,无源码).当前只存放 **FreeRTOS 任务通知的信号位**:各输入模块的 ISR 收到完整数据帧后,用 `xTaskNotifyFromISR()` 通知任务去解析,每种模块占用一个独立 bit.

## 常用功能

### ISR 通知任务(摘自 modules/DR16/dr16.c)

```c
#include "comp_def.h"

/* ISR 侧:UART 回调里收到完整帧后唤醒任务 */
xTaskNotifyFromISR(instance_->thread_alert, SIGNAL_DR16_RAW_REDY,
                   eSetBits, &woken);
portYIELD_FROM_ISR(woken);

/* 任务侧:等待并消费信号位 */
BaseType_t result = xTaskNotifyWait(SIGNAL_DR16_RAW_REDY, UINT32_MAX,
                                    &notify_value, pdMS_TO_TICKS(timeout));
```

### 已分配的信号位

| 信号位 | bit | 模块 |
| --- | --- | --- |
| `SIGNAL_I6X_RAW_READY` | 5 | I6X 接收机 |
| `SIGNAL_VT13_RAW_REDY` | 6 | VT13 图传链路 |
| `SIGNAL_DR16_RAW_REDY` | 7 | DR16 接收机 |
| `SIGNAL_LX824_RX_READY` | 8 | LX824 |
| `SIGNAL_IMU485_RAW_READY` | 9 | DM IMU(RS485 透传) |
| `VOFA_SIGNAL_RAW_READY` | 10 | VOFA 调试通道 |
| `SIGNAL_IMUCAN_RAW_READY` | 11 | CAN IMU |

## 注意事项

- **不同 SIGNAL 不能共用 bit 位**,否则任务通知会互相干扰;新增模块时在 `comp_def.h` 追加下一个空闲 bit,并同步更新上表.
- 信号位语义是「ISR → 任务」的原始数据就绪通知;解析、协议处理都在任务上下文完成.
