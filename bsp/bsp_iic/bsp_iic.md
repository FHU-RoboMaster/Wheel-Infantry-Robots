# bsp_iic

I2C BSP,以对象式控制块 `STM32IIC_t` 封装 HAL I2C 的**事件回调分发**.BSP 不封装收发 API——收发仍通过 `STM32IIC_GetHandle()` 拿 HAL 句柄自行调用;BSP 负责把 9 类 HAL 事件(主/从收发完成、内存读写完成、监听完成、错误、终止完成)分发到对象式用户回调.

## 常用功能

### 初始化与回调注册

```c
#include "bsp_iic.h"

static STM32IIC_t iic1;

static void on_mem_rx_done(STM32IIC_t* self)
{
    /* HAL_I2C_Mem_Read_IT 等异步操作完成后的处理 */
}

err_t iic_init(void)
{
    err_t err = STM32IIC_Init(&iic1, &hi2c1);
    return STM32IIC_RegisterCallback(&iic1, BSP_IIC_MEM_RX_CPLT_CB,
                                     on_mem_rx_done);
}
```

### 配合 HAL 进行收发

用 BSP 拿句柄、用 HAL 发起异步传输,完成后回调被自动分发:

```c
I2C_HandleTypeDef* hi2c = STM32IIC_GetHandle(&iic1);

uint8_t reg, value;
HAL_I2C_Mem_Read_IT(hi2c, 0x68 << 1, WHO_AM_I, I2C_MEMADD_SIZE_8BIT,
                    &value, 1);   /* 完成后触发 BSP_IIC_MEM_RX_CPLT_CB */
```

## 回调类型

`BSP_IIC_Callback_t` 与 HAL I2C 事件一一对应:

| 类型 | 对应 HAL 回调 |
| --- | --- |
| `BSP_IIC_MASTER_TX_CPLT_CB` / `BSP_IIC_MASTER_RX_CPLT_CB` | 主模式发送/接收完成 |
| `BSP_IIC_SLAVE_TX_CPLT_CB` / `BSP_IIC_SLAVE_RX_CPLT_CB` | 从模式发送/接收完成 |
| `BSP_IIC_LISTEN_CPLT_CB` | 监听完成 |
| `BSP_IIC_MEM_TX_CPLT_CB` / `BSP_IIC_MEM_RX_CPLT_CB` | 内存(寄存器)写/读完成 |
| `BSP_IIC_ERROR_CB` | 错误(触发时对象 `last_error_` 记为 FAILED) |
| `BSP_IIC_ABORT_CPLT_CB` | 终止完成 |

## 注意事项

- BSP 不拥有 HAL 句柄生命周期,`Init` 只绑定句柄并注册对象表,同一逻辑 ID 重复绑定返回 `BUSY`.
- 回调由 HAL 事件分发路径(通常为中断上下文)触发,必须短且非阻塞.
- `STM32IIC_SetCallback()` 可随时更新回调,传 `NULL` 即清除.
- 回调在 HAL I2C 事件路径中生效需要在工程中启用 `USE_HAL_I2C_REGISTER_CALLBACKS` 之外的默认分发方式(本模块直接覆盖 `HAL_I2C_xxxCallback` 弱符号,无需额外配置).
- **当前未参与编译**:`bsp/CMakeLists.txt` 中 `bsp_iic` 相关条目处于注释状态,接入外设前先取消注释.
