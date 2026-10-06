# shoot_task

发射控制任务.初始化发射电机 PID 后以 2ms 周期执行发射机构控制(摩擦轮 + 拨弹).

## 任务流程

```c
void shoot_task(void* argument) {
  shoot_status = OK;
  shoot_speed_pid_init();            /* 初始化发射电机 PID */

  while (1) {
    Shoot_Mode();                    /* 根据遥控器状态执行发射控制 */
    vTaskDelay(pdMS_TO_TICKS(2U));   /* 2ms 控制周期 */
  }
}
```

## 对外接口

| 接口 | 说明 |
| --- | --- |
| `void shoot_task(void* argument)` | 任务入口 |
| `volatile err_t shoot_status` | 任务状态:初始 `PENDING`,进入主循环前置为 `OK` |

## 依赖模块

- `calculate/dr16_calculate/shoot_control_dr16`:`shoot_speed_pid_init()` / `Shoot_Mode()`
- `app/can_device`:CAN 设备注册与启动(调度器启动前)

## 注意事项

- **当前未参与编译**:`task/CMakeLists.txt` 中没有 `shoot_task.c` 条目(连注释占位都没有),固件中由 `freertos.c` 的 `__weak` 空实现代替.
- `Shoot_Mode()` 当前为空实现(TODO),发射控制逻辑尚未完成.
- 发射机构电机(CAN1 上 2 台 M3508 摩擦轮 + 1 台 M2006 拨弹)的注册入口 `shoot_control_init()` 尚无调用方.
