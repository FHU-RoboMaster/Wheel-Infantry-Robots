# shoot_control_dr16

发射机构控制模块(DR16 遥控器).管理 CAN1 上的 2 台 M3508 摩擦轮 + 1 台 M2006 拨弹电机,使用增量式 PID;摩擦轮单速度环,拨弹电机速度位置双环.遥控数据来自全局 `dr16` 对象.

## 电机配置

| 机构 | 电机 | 设备 ID | CAN 总线 | 控制组 | 控制方式 |
| --- | --- | --- | --- | --- | --- |
| 左摩擦轮 | M3508 | 1 | CAN1 | 0x200 | 单速度环 |
| 右摩擦轮 | M3508 | 2 | CAN1 | 0x200 | 单速度环 |
| 拨弹 | M2006 | 3 | CAN1 | 0x200 | 速度位置双环 |

## API

| 函数 | 说明 |
| --- | --- |
| `err_t shoot_control_init(void)` | 初始化 CAN1 总线对象并注册 3 台电机(须在 `CAN_StartAll()` 之前;当前尚无调用方) |
| `void shoot_speed_pid_init(void)` | 初始化摩擦轮速度环与拨弹双环 PID |
| `void dj_motor_pid_control_location(motor_id, target_angle)` | 控制单台发射电机转到目标角度(单位:度),拨弹位置控制入口 |
| `void Shoot_Mode(void)` | 模式控制主函数,控制任务 2ms 周期调用 |

## 拨弹角度闭环

`dj_motor_pid_control_location()` 的流程:读取反馈输出轴弧度并转为角度 → `GetAngleBetween180` 归一化 → 首次调用时以当前角度为目标并复位 PID → 位置环输出目标速度 → 速度环输出电流 → 按电机类型限幅后下发.

## PID 参数

各环均启用 `PID_Integral_Limit | PID_Derivative_On_Measurement | PID_OutputFilter | PID_DerivativeFilter`:

| 电机 | 环 | Kp | MaxOut |
| --- | --- | --- | --- |
| 摩擦轮(1/2 号) | 速度环 | 10.0 | 12000 |
| 拨弹(3 号) | 速度环(双环内环) | 8.0 | 10000(M2006 电流上限) |
| 拨弹(3 号) | 位置环(双环外环) | 8.0 | 3000(输出为目标速度) |

## 注意事项

- **`Shoot_Mode()` 当前为空实现(TODO)**,发射逻辑尚未完成.
- CAN2 的 0x200 组已被底盘 1-4 号电机占用,因此发射机构放在 CAN1;电机 ID 不能与底盘冲突.
- 依赖 `dr16_task` 提供的全局 `DR16_t* dr16`.
