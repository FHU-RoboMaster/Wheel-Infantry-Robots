# bsp_can

CAN BSP,以对象式控制块 `STM32CAN_t` 封装 HAL CAN.只负责帧的收发与分发,不承载电机等业务协议;RX 采用「订阅-广播」模型,TX 不排队.

## 常用功能

### 初始化与启动

对象由调用方静态持有,按「绑定 → 过滤器 → 订阅 → 启动」的顺序初始化(摘自 `app/can_device`):

```c
#include "bsp_can.h"

static STM32CAN_t can2_instance;

err_t can_init(void)
{
    err_t err = STM32CAN_Init(&can2_instance, &hcan2);   /* 1. 绑定 HAL 句柄 */

    CAN_FilterTypeDef filter = { ... };                  /* 2. 配置过滤器 */
    err = STM32CAN_ConfigFilter(&can2_instance, &filter);

    err = STM32CAN_SubscribeRx(&can2_instance, my_rx_callback, NULL); /* 3. 注册订阅 */
    return STM32CAN_Start(&can2_instance);               /* 4. 启动并开中断 */
}
```

### 接收:订阅回调

每帧到达时(FIFO0/FIFO1 pending 中断)按注册顺序调用各订阅回调:

```c
static void my_rx_callback(STM32CAN_t* self, const BSP_CAN_Frame_t* frame,
                           void* context)
{
    if (frame->id_ == 0x201) {
        /* frame->data_[0..frame->size_) 为有效数据,DLC 之外的尾部已清零 */
    }
}
```

### 发送一帧

```c
uint8_t data[8] = {...};
err_t err = STM32CAN_Send(&can2_instance, 0x200, data, 8);
/* 也可以只持有 HAL 句柄时用 STM32CAN_SendByHandle(&hcan2, ...) */
```

## 注意事项

- 仅支持 Classical CAN 标准数据帧(ID ≤ 0x7FF,1..8 字节),不支持 FDCAN 和扩展帧发送.
- 发送不排队:无空邮箱立即返回 `BUSY`,不覆盖不重试,由上层下一周期用最新数据重发.
- 订阅必须在 `STM32CAN_Start()` 之前;启动后再订阅返回 `STATE_ERR`,不支持运行期退订.
- 每个控制块最多 `STM32CAN_RX_SUBSCRIBER_CAPACITY`(4)个订阅者;相同 callback+context 重复注册幂等.
- 回调运行在中断上下文,必须短且非阻塞;`frame` 是栈上快照,延后处理须先拷贝.
- 同一逻辑 ID 只允许绑定一个控制块,重复绑定返回 `BUSY`.
