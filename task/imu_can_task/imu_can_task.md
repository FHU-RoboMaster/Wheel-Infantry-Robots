# imu_can_task

DM IMU(CAN 总线)任务.消费 `can_device` 注册的 IMU 设备数据,不参与任何 CAN 初始化.

## 任务流程

```c
void imu_can_task(void* argument) {
  IMUCAN_t* imu = can_device_get_imu();     /* 经 getter 获取设备对象 */
  if (imu->init_error_ != OK) {             /* 初始化失败的设备直接退出任务 */
    vTaskDelete(NULL);
    return;
  }

  imu->thread_alert = xTaskGetCurrentTaskHandle();  /* 绑定通知句柄 */
  for (;;) imu_can_update(imu, 2u);         /* 等待 RX 通知并消费数据 */
}
```

## 对外接口

| 接口 | 说明 |
| --- | --- |
| `void imu_can_task(void* argument)` | 任务入口,CubeMX 在 `freertos.c` 中创建同名线程 |

## 依赖模块

- `app/can_device`:`can_device_get_imu()` 获取 IMU 对象
- `modules/dm_imu`(`imu_can`):CAN IMU 帧解析

## 注意事项

- 与其他输入任务不同,本任务不持有设备实例——对象由 `can_device` 以 `static` 持有,任务只绑定通知句柄并消费数据.
- `init_error_ != OK` 时任务自删;业务侧读取 IMU 数据前应检查设备在线状态.
