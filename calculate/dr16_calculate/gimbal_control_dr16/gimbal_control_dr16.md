# gimbal_control_dr16

云台控制模块(DR16 遥控器).管理 CAN1 上的 2 台 GM6020 云台电机(偏航 + 俯仰),使用增量式 PID 做速度/位置双环,遥控数据来自全局 `dr16` 对象.

## 电机配置

| 机构 | 电机 | 设备 ID | CAN 总线 | 控制组 |
| --- | --- | --- | --- | --- |
| 偏航 YAW | GM6020 | 1 | CAN1 | 0x1FF |
| 俯仰 PITCH | GM6020 | 2 | CAN1 | 0x1FF |

`reversed` 参数当前均为 `false`,按实际机械安装方向调整.

## API

| 函数 | 说明 |
| --- | --- |
| `err_t gimbal_control_init(void)` | 初始化 CAN1 总线对象并注册 2 台 GM6020(须在 `CAN_StartAll()` 之前调用;当前尚无调用方,接入时在 `can_device` 注册流程中调用) |
| `void gimbal_speed_pid_init(void)` | 初始化速度环 + 位置环 PID 实例(增量式 `PIDInstance_jie`) |
| `pid_device_t* gimbal_get_pid_device(index)` | 获取公共 PID 设备：0=YAW、1=PITCH，越界返回 NULL |
| `void Gimbal_Mode(void)` | 模式控制主函数,控制任务 2ms 周期调用 |

## PID 参数

完成电机注册和 PID 初始化后，统一通过 `pid_device_control_speed()` 或 `pid_device_control_location()` 控制，例如 `pid_device_control_location(gimbal_get_pid_device(0), 30.0f, 0.0f, true)`；末参为 `true` 时走最短路径，`false` 时直接使用目标和反馈角度。速度单位为转子 RPM，位置为单圈编码器角度（度），详见 [pid_device](../../../app/pid_device/pid_device.md)。

各环均启用 `PID_INC_INTEGRAL_LIMIT | PID_INC_DERIVATIVE_ON_MEASUREMENT | PID_INC_OUTPUT_FILTER | PID_INC_DERIVATIVE_FILTER`:

| 电机 | 环 | Kp | MaxOut |
| --- | --- | --- | --- |
| YAW(1 号) | 速度环 / 位置环 | 12.0 | 12000(积分限幅 3000) |
| PITCH(2 号) | 速度环 | 8.0 | 12000(积分限幅 3000) |
| PITCH(2 号) | 位置环 | 12.0 | 12000(积分限幅 3000) |

## 注意事项

- **`Gimbal_Mode()` 当前为空实现(TODO)**,云台控制逻辑尚未完成;`gimbal_task` 调用它只是空转.
- 依赖 `dr16_task` 提供的全局 `DR16_t* dr16`;遥控器离线时的处理需在模式函数中实现.
- 增量式 PID 的用法见 [`arithmetic/pid/pid_incremental/pid_incremental.md`](../../../arithmetic/pid/pid_incremental/pid_incremental.md).
