# bsp_pwm

PWM BSP,以对象式控制块 `STM32PWM_t` 封装定时器 PWM 输出通道.只保存 HAL 定时器句柄和通道号,不硬编码业务通道;时基与频率由 CubeMX 的定时器配置决定.

## 常用功能

### 输出 PWM

```c
#include "bsp_pwm.h"

static STM32PWM_t beeper_pwm;   /* 例:TIM4_CH3 上的蜂鸣器 */

err_t beeper_init(void)
{
    err_t err = STM32PWM_Init(&beeper_pwm, &htim4, TIM_CHANNEL_3);
    err = STM32PWM_Start(&beeper_pwm);       /* 启动 PWM 输出 */
    return STM32PWM_SetDutyCycle(&beeper_pwm, 0.5f);  /* 50% 占空比 */
}
```

### 调节占空比与停止

```c
STM32PWM_SetDutyCycle(&beeper_pwm, 0.0f);  /* 静音:只清零比较值,不停止 PWM */
STM32PWM_Stop(&beeper_pwm);                /* 彻底停止通道输出 */
```

## 注意事项

- 占空比约定范围 `[0.0, 1.0]`,超范围返回 `OUT_OF_RANGE`;`0.0` 只清零比较值,不隐式停止 PWM.
- 比较值 = `duty_cycle × ARR`,实际分辨率由 CubeMX 中定时器的 ARR(周期)配置决定.
- `Init` 只绑定句柄和通道,`Start` 之后才有输出;`Start`/`Stop` 失败以错误码上报(`FAILED`),不强行改状态.
- BSP 不配置时基,输出频率在 CubeMX 定时器配置里设置(预分频 + ARR).
