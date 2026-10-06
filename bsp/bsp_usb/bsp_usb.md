# bsp_usb

USB CDC BSP(当前仅映射 USB_OTG_FS),以对象式控制块 `STM32USB_t` 封装 CDC 虚拟串口的数据收发.USB 设备的枚举启动仍由 CubeMX 生成的 `MX_USB_DEVICE_Init()` 完成,BSP 只负责数据面.

## 常用功能

### 初始化

```c
#include "bsp_usb.h"

static STM32USB_t usb_cdc;

static void usb_rx_callback(uint8_t* data, size_t size)
{
    /* CDC OUT 收到的数据片段,仅本次回调有效,延后处理先拷贝 */
}

static void usb_tx_done_callback(void)
{
    /* CDC IN 发送完成,发送窗口已释放 */
}

err_t usb_init(void)
{
    /* 在 MX_USB_DEVICE_Init() 之后调用 */
    return STM32USB_Init(&usb_cdc, &hUsbDeviceFS,
                         usb_rx_callback, usb_tx_done_callback);
}
```

### CDC 发送

```c
if (STM32USB_IsConfigured(&usb_cdc)) {          /* 已枚举并进入 CONFIGURED */
    uint8_t msg[] = "hello";
    err_t err = STM32USB_Write(&usb_cdc, msg, sizeof(msg));
    /* 忙(上一次 IN 传输未完成)时返回 BUSY,不排队,可下一周期重试 */
}
```

### CDC 接收

接收数据由 CDC 接收路径进入 BSP 再分发给用户回调.需在 CubeMX 生成的 `usbd_cdc_if.c` 中挂接:

```c
/* CDC_Receive_FS() 末尾: */
STM32USB_HandleRxData(hUsbDeviceFS, UserRxBufferFS, *Len);

/* CDC_TransmitCplt_FS() 末尾: */
STM32USB_HandleTxComplete(hUsbDeviceFS);
```

## 注意事项

- 单次发送不能超过 `APP_TX_DATA_SIZE`(CubeMX CDC 配置的缓冲大小),超限返回 `OUT_OF_RANGE`.
- `Write` 内部先把数据拷贝进 `UserTxBufferFS` 再发起传输,调用方栈上临时数据是安全的;但同一时刻只有一个 IN 传输在飞,忙时返回 `BUSY`.
- 设备未枚举完成(未进入 `USBD_STATE_CONFIGURED`)时 `Write` 返回 `STATE_ERR`,发送前可用 `IsConfigured()` 预判.
- 回调运行在 USB 中断上下文,必须短且非阻塞.
- **当前未参与编译**:`bsp/CMakeLists.txt` 中 `bsp_usb` 相关条目处于注释状态,且工程尚未接入 `usbd_cdc_if.c` 挂接,启用前需先完成这两步.
