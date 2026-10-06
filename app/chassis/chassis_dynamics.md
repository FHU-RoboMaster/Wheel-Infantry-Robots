# chassis_dynamics

底盘动力学模块:麦克纳姆轮**运动学逆解** + 基于姿态角的**重力前馈补偿**.把底盘目标速度转换为四轮速度,并在底盘倾斜时提前补偿重力矩.

## 物理参数

| 参数 | 值 | 说明 |
| --- | --- | --- |
| `G` | 20.0f | 车重,用于计算重力补偿力矩 |
| `R` | 0.076f | 麦轮有效半径 (m) |
| `K` | 1000.0f | 力→电机输出的转换系数 |

## 常用功能

### 麦轮运动学逆解

```c
#include "chassis_dynamics.h"

float wheel_speed[CHASSIS_DYNAMICS_WHEEL_COUNT];
chassis_dynamics_inverse(vx, vy, wz, wheel_speed);
/* wheel_speed[i] 依次为 [FL, FR, RL, RR] = [4, 3, 2, 1] 号电机的目标速度 */
```

坐标系约定:`+X` 前、`+Y` 左、`+Z` 上;`wz > 0` 为从上往下看顺时针.逆解系数 `s = √2/2`,四轮为 vx/vy/wz 的线性组合.

### 姿态前馈补偿

```c
/* 由 IMU 姿态处理周期性更新姿态 */
chassis_dynamics_set_attitude(yaw, pitch, roll, motor_yaw, motor_pitch);

float ff[CHASSIS_DYNAMICS_WHEEL_COUNT];
chassis_dynamics_feedforward(ff);
/* ff[i] 叠加到对应轮的 PID 电流输出上 */
```

补偿原理:实际俯仰角 = 测量值 − 机械俯仰偏移;按横滚/俯仰的 `sin` 分量计算重力落在各轮上的力矩(系数 `√2·R·K`),倾斜越明显补偿越大.

## 注意事项

- 输出数组顺序**固定**为 `[FL, FR, RL, RR] = [4, 3, 2, 1]` 号电机,与 `chassis_control_dr16` 的电机索引一致.
- 逆解输出的是「运动学正方向」,**不等同于电机机械正转方向**;电机正反转由 `chassis_control.c` 的 `reversed` 参数统一处理.
- `set_attitude()` 的 yaw 与 motor_yaw 参数当前未使用,仅为保留接口.
- 当前 `chassis_control.c` 仅包含了本模块头文件,**函数尚未被调用**(控制层暂用内联解算);接入时把 `Chassis_Mode()` 的解算替换为本模块接口即可.
