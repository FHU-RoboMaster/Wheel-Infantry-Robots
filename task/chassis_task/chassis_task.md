# chassis_task

底盘控制任务.使用 `main.c`/`can_device` 已注册并启动的 CAN2 底盘电机,初始化速度环 PID 后以 2ms 周期执行底盘运动控制.

## 任务流程

```c
void chassis_task(void* argument) {
  chassis_status = OK;               /* CAN 设备由 can_device 在调度器启动前完成 */
  chassis_speed_pid_init();          /* 初始化 4 台 M3508 速度环 PID */

  while (1) {
    Chassis_Mode();                  /* 根据遥控器状态执行底盘控制 */
    vTaskDelay(pdMS_TO_TICKS(2U));   /* 2ms 控制周期 */
  }
}
```

## 对外接口

| 接口 | 说明 |
| --- | --- |
| `void chassis_task(void* argument)` | 任务入口,CubeMX 在 `freertos.c` 中创建同名线程 |
| `volatile err_t chassis_status` | 任务状态:初始 `PENDING`,进入主循环前置为 `OK`,供其他任务监控 |

## 依赖模块

- `calculate/dr16_calculate/chassis_control_dr16`:`chassis_speed_pid_init()` / `Chassis_Mode()`,电机注册与运动学
- `app/can_device`:CAN2 与底盘电机的注册、启动(调度器启动前)

## 注意事项

- 电机注册、过滤器、`CAN_StartAll()` 都发生在调度器启动之前,任务内不做任何 CAN 初始化.
- 运动控制逻辑(模式开关映射、麦轮解算)见 `chassis_control_dr16` 的 `Chassis_Mode()`.
- 控制周期 2ms(500Hz);任务由 CubeMX `freertos.c` 创建,优先级与栈大小在 `chassis_attributes` 中配置.
