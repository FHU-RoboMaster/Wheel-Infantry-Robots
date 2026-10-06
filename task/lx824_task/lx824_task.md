# lx824_task

LX824 舵机任务.初始化 UART1 舵机总线,并周期性通过读 ID 指令(Cmd 14)轮询总线上唯一一台舵机.

## 任务流程

```c
void lx824_task(void* argument) {
  static LX824_t lx824_instance;
  err_t status = LX824_Init(&lx824_instance, &huart1);   /* UART1 舵机总线 */
  lx824 = &lx824_instance;
  lx824->thread_alert = xTaskGetCurrentTaskHandle();

  if (status == OK) status = LX824_Start(lx824);
  ASSERT(status == OK);
  if (status != OK) { vTaskDelete(NULL); return; }

  for (;;) {
    uint8_t servo_id = 0U;
    const err_t err = LX824_IdRead(lx824, LX824_BROADCAST_ID, &servo_id);
    if (err == OK) { /* 缓存 servo_id 并更新调试变量 */ }
    vTaskDelay(pdMS_TO_TICKS(100U));      /* 100ms 轮询周期 */
  }
}
```

## 对外接口

| 接口 | 说明 |
| --- | --- |
| `void lx824_task(void* argument)` | 任务入口,CubeMX 在 `freertos.c` 中创建同名线程 |
| `LX824_t* lx824` | 全局对象指针,供其他模块复用舵机总线 |
| `volatile uint8_t debug_lx824_servo_id` 等 | 调试观测变量:最近读到的 ID、有效标志、错误码 |

## 依赖模块

- `modules/LX824`:LX824 舵机协议(`LX824_Init` / `LX824_Start` / `LX824_IdRead`)
- `Core/Src/usart.c`:`huart1`

## 注意事项

- 广播读 ID(`LX824_BROADCAST_ID`)**只适用于总线上仅挂一台舵机的调试场景**;多舵机组网需改为按 ID 单独读取.
- 串口当前固定使用 `huart1`(注释注明 `huart2 = DR16`);头文件中预留的 `LX824Task_GetServoId()` 包装接口被注释,尚未提供.
- 头文件与实现中该任务命名为 `lx824_task`,与 `freertos.c` 创建的线程一致.
