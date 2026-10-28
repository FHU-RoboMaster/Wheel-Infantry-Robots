#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "comp_cmd.h"
#include "main.h"

typedef struct GPIO GPIO;

typedef enum {
  GPIO_DIRECTION_INPUT = 0,              /* 浮空输入 */
  GPIO_DIRECTION_OUTPUT_PUSH_PULL,       /* 推挽输出 */
  GPIO_DIRECTION_OUTPUT_OPEN_DRAIN,      /* 开漏输出 */
  GPIO_DIRECTION_FALL_INTERRUPT,         /* 下降沿中断 */
  GPIO_DIRECTION_RISING_INTERRUPT,       /* 上升沿中断 */
  GPIO_DIRECTION_FALL_RISING_INTERRUPT   /* 双边沿中断 */
} GPIO_Direction;

/* GPIO 输入模式的上拉/下拉配置。 */
typedef enum {
  GPIO_PULL_NONE = 0,  /* 无上下拉 */
  GPIO_PULL_UP,        /* 上拉 */
  GPIO_PULL_DOWN       /* 下拉 */
} GPIO_Pull;

typedef struct {
  GPIO_Direction direction;  /* 引脚方向或中断触发方式 */
  GPIO_Pull pull;            /* 输入上下拉方式 */
} GPIO_Configuration;

typedef void (*GPIO_Callback)(GPIO* gpio, bool active, void* context);

struct GPIO {
  GPIO_TypeDef* port;
  uint16_t pin;
  IRQn_Type irq;
  GPIO_Callback callback;
  void* callback_context;
  err_t last_error;
};

#ifdef __cplusplus
extern "C" {
#endif

/* The return value preserves the original C API; callers normally use gpio. */
GPIO GPIO_Init(GPIO* gpio, GPIO_TypeDef* port, uint16_t pin, IRQn_Type irq);

bool GPIO_Read(const GPIO* gpio);
void GPIO_Write(GPIO* gpio, bool value);

err_t GPIO_EnableInterrupt(GPIO* gpio);
err_t GPIO_DisableInterrupt(GPIO* gpio);
err_t GPIO_SetConfig(GPIO* gpio, GPIO_Configuration config);
err_t GPIO_RegisterCallback(GPIO* gpio, GPIO_Callback callback, void* context);
err_t GPIO_GetLastError(const GPIO* gpio);

/* Called by the HAL EXTI callback and useful for tests or board glue. */
void GPIO_DispatchInterrupt(uint16_t pin);

void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin);
void HAL_GPIO_EXTI_Rising_Callback(uint16_t GPIO_Pin);
void HAL_GPIO_EXTI_Falling_Callback(uint16_t GPIO_Pin);

#ifdef __cplusplus
}
#endif
