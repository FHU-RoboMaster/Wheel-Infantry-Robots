# imu_485_task

DM IMU(RS485 透传串口)任务.初始化 UART5 上的 IMU 接收逻辑,并周期性刷新解码结果与在线状态.

## 任务流程

```c
void imu_485_task(void* argument) {
  static IMU485_t instance;
  err_t status = imu_485_init(&instance, &huart5);
  imu_485_device = &instance;                /* 全局指针,供业务读取 IMU 数据 */
  instance.thread_alert = xTaskGetCurrentTaskHandle();

  if (status == OK) status = imu_485_start(imu_485_device);
  ASSERT(status == OK);
  if (status != OK) { vTaskDelete(NULL); return; }

  for (;;) {
    imu_485_update(imu_485_device, IMU485_OFFLINE_TIMEOUT_MS);
  }
}
```

## 对外接口

| 接口 | 说明 |
| --- | --- |
| `void imu_485_task(void* argument)` | 任务入口,CubeMX 在 `freertos.c` 中创建同名线程 |
| `IMU485_t* imu_485_device` | 全局对象指针,经 `->data` 读取解码后的 IMU 数据 |

## 依赖模块

- `modules/dm_imu`(`imu_rs485`):DM IMU 帧解析,底层走 `bsp_uart` DMA 空闲线接收
- `component/comp_def`:`SIGNAL_IMU485_RAW_READY` 信号位

## 注意事项

- 任务阻塞在 `imu_485_update()` 内等待任务通知;超时未收到完整帧则置离线.
- 初始化失败会 `ASSERT` 并自删,全局指针仍有效但数据冻结.
