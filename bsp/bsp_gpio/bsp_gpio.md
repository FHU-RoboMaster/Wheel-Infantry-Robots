# bsp_gpio

GPIO BSP，以对象式控制块 `GPIO` 封装单引脚读写与 EXTI 中断分发。对象只保存端口、引脚掩码、NVIC 中断号、回调与最近错误码，不硬编码业务引脚；方向、上下拉和触发方式由 `GPIO_SetConfig()` 交给 HAL 配置。

## 常用功能

### 初始化与配置一个输出引脚

对象由调用方静态持有，`GPIO_Init()` 只记录参数，`GPIO_SetConfig()` 才真正调用 `HAL_GPIO_Init()`：

```c
#include "bsp_gpio.h"

static GPIO led;   /* 例:PA7 上的 LED */

err_t led_init(void)
{
    GPIO_Init(&led, LED_GPIO_Port, LED_Pin, NonMaskableInt_IRQn); /* 不用中断 */
    return GPIO_SetConfig(&led, (GPIO_Configuration){
        .direction = GPIO_DIRECTION_OUTPUT_PUSH_PULL,
        .pull      = GPIO_PULL_NONE});
}
```

### 读写电平

```c
GPIO_Write(&led, true);         /* 写 BSRR 置位,输出高电平 */
GPIO_Write(&led, false);        /* 写 BSRR 复位位,输出低电平 */

bool level = GPIO_Read(&led);   /* 直接读 IDR */
```

### 外部中断与回调

```c
static GPIO key;

static void on_key(GPIO* gpio, bool active, void* context)
{
    (void)gpio;
    (void)active;   /* 固定为 true,边沿方向由配置决定 */
    /* 中断上下文:只置标志或投递事件,不做耗时操作 */
}

err_t key_init(void)
{
    GPIO_Init(&key, GPIOB, GPIO_PIN_0, EXTI0_IRQn);
    err_t err = GPIO_SetConfig(&key, (GPIO_Configuration){
        .direction = GPIO_DIRECTION_FALL_INTERRUPT,
        .pull      = GPIO_PULL_UP});
    err = GPIO_RegisterCallback(&key, on_key, NULL);  /* 传 NULL 可清除回调 */
    return GPIO_EnableInterrupt(&key);                /* 使能 NVIC,失败看 err */
}
```

## 方向与上下拉

`GPIO_Configuration.direction` 与 HAL 工作模式的对应关系：

| `GPIO_Direction`                       | HAL `Mode`                    | 说明            |
| -------------------------------------- | ----------------------------- | --------------- |
| `GPIO_DIRECTION_INPUT`                 | `GPIO_MODE_INPUT`             | 普通输入        |
| `GPIO_DIRECTION_OUTPUT_PUSH_PULL`      | `GPIO_MODE_OUTPUT_PP`         | 推挽输出        |
| `GPIO_DIRECTION_OUTPUT_OPEN_DRAIN`     | `GPIO_MODE_OUTPUT_OD`         | 开漏输出        |
| `GPIO_DIRECTION_FALL_INTERRUPT`        | `GPIO_MODE_IT_FALLING`        | 下降沿触发 EXTI |
| `GPIO_DIRECTION_RISING_INTERRUPT`      | `GPIO_MODE_IT_RISING`         | 上升沿触发 EXTI |
| `GPIO_DIRECTION_FALL_RISING_INTERRUPT` | `GPIO_MODE_IT_RISING_FALLING` | 双边沿触发 EXTI |

`GPIO_Configuration.pull` 取值 `GPIO_PULL_NONE` / `GPIO_PULL_UP` / `GPIO_PULL_DOWN`，分别映射到 `GPIO_NOPULL` / `GPIO_PULLUP` / `GPIO_PULLDOWN`。

## 注意事项

- 每个对象只支持单个引脚：掩码为 0 或含多个 bit（如 `GPIO_PIN_0 | GPIO_PIN_1`）时 `GPIO_Init()` 置 `ARG_ERR`，且不参与中断分发。
- EXTI 线由所有端口共享（0~15 共 16 条），每条线只映射一个对象：`PA0` 与 `PB0` 同时注册时后者接管该线，先注册的回调不再被调用。
- 只有 `irq != NonMaskableInt_IRQn` 的对象才登记进 EXTI 映射；`NonMaskableInt_IRQn` 表示纯 IO，此时 `GPIO_EnableInterrupt()` / `GPIO_DisableInterrupt()` 返回 `STATE_ERR`。
- `GPIO_Init()` 返回对象副本（正常使用传指针）；它会清空回调与上下文、把 `last_error` 置 `OK`，对象复用时先解绑旧的 EXTI 映射。
- `GPIO_Init()` 传入 `NULL` 端口或非法引脚只置 `last_error = ARG_ERR` 而不返回错误码，需要时用 `GPIO_GetLastError()` 查询。
- `GPIO_SetConfig()` 固定使用 `GPIO_SPEED_FREQ_HIGH`；方向或上下拉枚举越界时返回 `ARG_ERR`，不会调用 `HAL_GPIO_Init()`。
- `GPIO_Read()` / `GPIO_Write()` 用 `ASSERT` 校验指针，在 `MCU_DEBUG_BUILD` 下非法指针进入 `verify_failed()` 而不是返回错误码，且这两个函数不更新 `last_error`。
- 回调固定以 `active = true` 触发，上升/下降沿的区分来自 `GPIO_SetConfig()` 的触发模式，回调内需自行判断来源。
- 本模块覆盖了 HAL 的 `HAL_GPIO_EXTI_Callback` / `HAL_GPIO_EXTI_Rising_Callback` / `HAL_GPIO_EXTI_Falling_Callback` 弱符号，工程内不要再重复定义；EXTI 的 NVIC 优先级仍在 CubeMX 生成的 `MX_NVIC_Init()` 中设置。
- 回调运行在中断上下文，必须短且非阻塞；`GPIO_DispatchInterrupt(pin)` 暴露出来便于板级胶水代码或测试直接注入一次中断。
- 端口时钟使能由 CubeMX 的 `MX_GPIO_Init()` 负责，BSP 不做 `__HAL_RCC_GPIOx_CLK_ENABLE()`。
