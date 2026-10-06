# can_device

> CAN 设备统一初始化模块

`can_device` 是全车 CAN 总线设备的**集中初始化与注册入口**。它负责 HAL CAN 句柄与 BSP 对象的绑定、过滤器配置、各 CAN 设备(电机、IMU 等)的注册,以及总线的统一启动,使各任务只需通过 getter 获取设备对象即可使用,不必关心底层的初始化顺序。

## 文件说明

| 文件 | 说明 |
| --- | --- |
| `can_device.h` | 对外 API:`can_device_Init()`、`CAN_RegisterAllDevices()`、`CAN_StartAll()`、`can_device_get_imu()` |
| `can_device.c` | 模块实现:持有 CAN1/CAN2 的 `STM32CAN_t` 实例与 `IMUCAN_t` 对象,完成初始化时序 |

## 总线与设备分配

| 总线 | 过滤器配置 | 挂载设备 |
| --- | --- | --- |
| CAN1 | Filter Bank 0,接收所有帧 → FIFO1 | 6 台 DM 关节电机(`dm_motor_ctrl`,预留) |
| CAN2 | Filter Bank 14,接收所有帧 → FIFO0 | DM IMU(`imu_can`,can_id=`0x01`,mst_id=`0x11`)+ 4 台底盘 M3508(`chassis_control`,控制组 `0x200`) |

> 两条过滤器均采用 32 位掩码模式、掩码全 0,即接收所有 ID 的帧;具体设备的帧过滤由各设备模块的 RX 订阅回调自行完成。
> 当前版本 `CAN_RegisterAllDevices()` 仅注册了 CAN2 上的 IMU 与底盘电机,CAN1 的 DM 关节电机待接入后在此处补充注册。

## 初始化时序

`can_device_Init()` 须在 **RTOS 调度器启动前**调用一次(如 `main.c` 中 `MX_CAN1_Init()`/`MX_CAN2_Init()` 之后、`osKernelStart()` 之前)。内部按以下顺序执行,任一步骤失败立即进入 `Error_Handler()`:

```
main.c (CubeMX)
  └─ MX_CAN1_Init() / MX_CAN2_Init()          # HAL 层外设初始化

can_device_Init()                              # 调度器启动前调用
  ├─ STM32CAN_Init(&can2_instance, &hcan2)    # 1. 绑定 BSP CAN 对象
  ├─ STM32CAN_Init(&can1_instance, &hcan1)
  ├─ STM32CAN_ConfigFilter(...)               # 2. 配置两条总线的过滤器
  ├─ CAN_RegisterAllDevices()                 # 3. 注册所有设备及其 RX 回调
  │    ├─ imu_can_init(&imu_can_instance, &can2_instance, 0x01, 0x11)
  │    └─ chassis_control_init()              #    底盘 4 台 M3508(CAN2)
  └─ CAN_StartAll()                           # 4. 启动 CAN1 / CAN2
```

顺序约束的原因:

1. **必须先 `STM32CAN_Init()` 再注册设备**:`chassis_control_init()` 通过 BSP 对象表反查 CAN2 实例(`STM32CAN_GetInstance()`),若对象尚未绑定会失败。
2. **必须最后 `CAN_StartAll()`**:所有设备注册完成后才允许启动总线;启动后禁止再调用 `STM32CAN_SubscribeRx()` 新增 RX 订阅者,否则任务之间会产生竞争。

## 任务侧使用方式

设备对象由本模块以 `static` 持有,任务通过 getter 访问,避免暴露全局变量。以 IMU 任务为例:

```c
void imu_can_task(void* argument) {
  IMUCAN_t* imu = can_device_get_imu();
  if (imu->init_error_ != OK) {   // 初始化失败的设备直接退出任务
    vTaskDelete(NULL);
    return;
  }
  imu->thread_alert = xTaskGetCurrentTaskHandle();  // 绑定任务通知句柄
  for (;;) imu_can_update(imu, 2u);                 // 等待 RX 通知并消费数据
}
```

## API 一览

| 函数 | 说明 |
| --- | --- |
| `void can_device_Init(void)` | 一站式初始化:对象绑定 → 过滤器 → 设备注册 → 总线启动。调度器启动前调用一次 |
| `err_t CAN_RegisterAllDevices(void)` | 注册所有 CAN 设备及其 RX 回调;须在 `STM32CAN_Init()` 之后、`CAN_StartAll()` 之前调用 |
| `err_t CAN_StartAll(void)` | 启动全部 CAN 总线;须在所有设备注册完成后调用,启动后禁止新增 RX 订阅者 |
| `IMUCAN_t* can_device_get_imu(void)` | 获取已注册的 IMU 设备对象指针;若未初始化可能返回未就绪的对象,使用前检查 `init_error_` |

## 依赖关系

| 依赖模块 | 用途 |
| --- | --- |
| `bsp/bsp_can` | `STM32CAN_t` 对象绑定、过滤器配置、启动、RX 订阅(详见 `bsp/bsp_can/bsp_can.md`) |
| `modules/dm_imu`(`imu_can`) | DM IMU 设备驱动,注册于 CAN2 |
| `calculate/dr16_calculate/chassis_control_dr16`(`chassis_control`) | 底盘 4 台 M3508 电机注册(内部经 `modules/motor/dj_motor` 走 CAN2) |
| `modules/motor/dm_motor`(`dm_motor_ctrl`) | DM 关节电机驱动,预留于 CAN1 |
| `Core/Src/can.c` | CubeMX 生成的 `hcan1`/`hcan2` HAL 句柄 |

## 如何新增 CAN 设备

1. 在 `can_device.c` 中定义设备对象(参考 `imu_can_instance`,使用 `static` 持有)。
2. 在 `CAN_RegisterAllDevices()` 中调用该设备的 `xxx_init()`,传入对应的 `STM32CAN_t` 实例并完成 RX 订阅。
3. 如需对外访问,在 `can_device.h` 中补充 getter 函数。
4. 注意保持顺序:所有注册都必须发生在 `CAN_StartAll()` 之前。
