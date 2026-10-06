# gimbal_task

云台控制任务.使用 `main.c`/`can_device` 已注册并启动的 CAN 设备,初始化速度环 PID 后以 2ms 周期执行云台控制.

## 任务流程

```c
void gimbal_task(void* argument) {
  gimbal_status = OK;
  gimbal_speed_pid_init();           /* 初始化云台电机 PID */

  while (1) {
    Gimbal_Mode();                   /* 根据遥控器状态执行云台控制 */
    vTaskDelay(pdMS_TO_TICKS(2U));   /* 2ms 控制周期 */
  }
}
```

## 对外接口

| 接口 | 说明 |
| --- | --- |
| `void gimbal_task(void* argument)` | 任务入口,CubeMX 在 `freertos.c` 中创建同名线程 |
| `volatile err_t gimbal_status` | 任务状态:初始 `PENDING`,进入主循环前置为 `OK` |

## 依赖模块

- `calculate/dr16_calculate/gimbal_control_dr16`:`gimbal_speed_pid_init()` / `Gimbal_Mode()`
- `app/can_device`:CAN 设备注册与启动(调度器启动前)

## 注意事项

- `Gimbal_Mode()` 当前为空实现(TODO),云台控制逻辑尚未完成.
- 云台电机(CAN1 上的 2 台 GM6020)的注册入口 `gimbal_control_init()` 尚无调用方,接入前需在 `can_device` 的注册流程中调用.
