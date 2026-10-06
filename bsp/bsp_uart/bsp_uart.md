# bsp_uart

UART BSP,提供三种独立通道:单缓冲 DMA RX(循环 DMA + 空闲线切分)、变长帧 DMA TX(软件双缓冲)和定长连续流 TX(硬件 DBM).HAL 回调只负责切分数据与推进发送状态,协议解析和业务逻辑应放在任务上下文.

## 常用功能

### DMA 接收(空闲线切分)

RX 使用硬件循环 DMA,HAL 空闲线(IDLE)事件到来时按 DMA 写入位置切分新数据并回调;环形缓冲回绕时会拆成尾、头两段分别回调(摘自 `modules/dm_imu/imu_rs485`):

```c
#include "bsp_uart.h"

static uint8_t dma_buffer_[256];

static void my_rx_callback(uint8_t* data, size_t size)
{
    /* data 指向 DMA 缓冲内本次新收到的片段,仅本次回调有效 */
}

static STM32UART_t uart_rx;

err_t uart_rx_init(UART_HandleTypeDef* huart)
{
    err_t err = STM32UART_Init(&uart_rx, huart,
                               (BSP_UART_RawData_t){dma_buffer_, sizeof(dma_buffer_)},
                               my_rx_callback);       /* 1. 绑定句柄/缓冲/回调 */
    return STM32UART_SetRxDMA(&uart_rx);              /* 2. 启动循环 DMA 接收 */
}
```

### 变长帧 DMA 发送

软件双缓冲轮转:DMA 空闲时 `Write` 立即发送;忙时写入另一块缓冲排队一帧,完成中断后自动续发:

```c
static uint8_t tx_buf0[64], tx_buf1[64];
static STM32UARTFrameTx_t uart_tx;

err_t uart_tx_init(UART_HandleTypeDef* huart)
{
    err_t err = STM32UARTFrameTx_Init(&uart_tx, huart,
                                      (BSP_UART_RawData_t){tx_buf0, sizeof(tx_buf0)},
                                      (BSP_UART_RawData_t){tx_buf1, sizeof(tx_buf1)},
                                      NULL);
    return STM32UARTFrameTx_SetTxDMA(&uart_tx);
}

void send_frame(const uint8_t* data, size_t size)
{
    /* 忙时排队;pending 已满返回 BUSY,不覆盖已接受的帧 */
    (void)STM32UARTFrameTx_Write(&uart_tx, data, size);
}
```

### 定长连续流发送(硬件 DBM)

M0/M1 两页以相同 NDTR 由硬件自动循环切换,适合音频流、调试波形等恒定码率输出;每次页发送完成时回调刚空闲的页,在 ISR 中填充下一轮数据:

```c
static uint8_t page0[512] __attribute__((section(".sram")));  /* 须在 DMA 可访问的 SRAM */
static uint8_t page1[512];
static STM32UARTDoubleBufTx_t uart_stream;

static void refill_callback(uint8_t* data, size_t size)
{
    /* data 指向刚发送完的空闲页;不更新则循环发送旧内容 */
}

err_t stream_init(UART_HandleTypeDef* huart)
{
    err_t err = STM32UARTDoubleBufTx_Init(&uart_stream, huart,
                                          (BSP_UART_RawData_t){page0, sizeof(page0)},
                                          (BSP_UART_RawData_t){page1, sizeof(page1)},
                                          refill_callback);
    err = STM32UARTDoubleBufTx_SetTxDMA(&uart_stream);
    /* Write 同步填充两页并启动连续发送;之后由回调逐页刷新 */
    return STM32UARTDoubleBufTx_Write(&uart_stream, init_page, sizeof(page0));
}

/* 需要停止时(仅任务上下文且未进临界区): */
/* STM32UARTDoubleBufTx_Stop(&uart_stream); */
```

## 注意事项

- 缓冲区由调用方持有,BSP 不管理生命周期;RX/TX 缓冲必须在整个使用期间有效.
- RX 回调运行在 HAL 回调(中断)上下文,必须短且非阻塞;延后处理先拷贝.
- 变长帧与硬件 DBM 互斥:同一 UART 只能注册一个 TX 对象.
- 两块 TX 缓冲必须等长、非重叠且 ≤ 65535 字节(DMA NDTR 为 16 位);单次 Write 不能超过缓冲容量.
- 硬件 DBM 的缓冲必须位于 DMA 可访问的 SRAM,不能放在 CCM;页填充回调的耗时和中断延迟必须小于一页的发送时间.
- 变长帧 TX 只保留一块 pending 缓冲,已满返回 `BUSY`;返回失败表示本次写入未被接受,可安全重试.
- `Stop()` 不是页边界操作,可能截断当前页,已进入 UART 的字节仍会发出.
