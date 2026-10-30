# pid_device

统一 DJI 电机的速度环和单圈位置串级环。底盘、云台和发射机构负责电机注册、PID 调参、目标生成及模式切换；公共层负责反馈读取、PID 调用、前馈叠加、型号限幅与命令写入。

## 接口

包含 `pid_device.h` 即可调用，不需要同时包含两种底层 PID 头文件。

| 接口 | 用途 |
| --- | --- |
| `pid_device_init(device, motor, algorithm, speed_pid, location_pid)` | 绑定电机和已初始化的 PID 状态；单速度环的 `location_pid` 为 `NULL` |
| `pid_device_control_speed(device, target_rpm, feedforward)` | 速度环控制 |
| `pid_device_control_location(device, target_deg, feedforward, is_optimize)` | 位置环输出目标 RPM，再运行速度环；`is_optimize` 选择最短路径或直接角度控制 |

`PID_DEVICE_POSITIONAL` 对应 `PIDInstance` / `PIDInit`；`PID_DEVICE_INCREMENTAL` 对应 `PIDInstance_jie` / `PID_Init_Params_jie`。传入的两个 PID 指针必须与所选算法匹配。公共层不分配或释放实例，也不重置 PID。一个 PID 实例只服务一台电机的一个环，所有对象的生命周期必须覆盖控制过程。

本模块的实现与接口集中在 `pid_device.c` 和 `pid_device.h`。增量式 PID 的功能标志统一使用 `PID_INC_*` 枚举名称，与位置式标志区分，两个算法头文件可直接同时包含，无需宏重命名。枚举数值、实例布局和底层算法保持不变。两种 PID 计算接口统一使用 `(pid, target, actual)` 参数顺序；公共层统一对外的目标和反馈含义，保留原有计算算法、滤波、时间基准和状态。

## 三个模块的统一调用

各模块的 `*_speed_pid_init()` 初始化原有 PID 参数并绑定设备，getter 的参数是数组索引，不是 CAN 设备 ID。

| 设备访问接口 | 索引 | 绑定算法 | 支持的控制 |
| --- | --- | --- | --- |
| `chassis_get_pid_device(index)` | FL=0、FR=1、RL=2、RR=3 | 位置式 | 速度环 |
| `shoot_get_pid_device(index)` | 左摩擦轮=0、右摩擦轮=1、拨弹=2 | 增量式 | 摩擦轮速度环；拨弹速度环或位置串级环 |
| `gimbal_get_pid_device(index)` | YAW=0、PITCH=1 | 增量式 | 速度环或位置串级环 |

getter 越界返回 `NULL`。控制前必须完成对应的 `*_control_init()` 与 `*_speed_pid_init()`。电机注册须在 CAN 启动前完成；当前 `CAN_RegisterAllDevices()` 仅调用底盘注册，云台和发射机构仍需在该流程接入各自的注册函数，其模式函数也仍有 TODO。

```c
#include "chassis_control.h"
#include "gimbal_control.h"
#include "shoot_control.h"

/* 以下调用放在对应控制任务中，先完成电机注册和 PID 初始化。 */
err_t status = pid_device_control_speed(
    chassis_get_pid_device(CHASSIS_MOTOR_FL), 3000.0f, 100.0f);

/* 摩擦轮：速度环；拨弹和云台：位置串级环。 */
status = pid_device_control_speed(shoot_get_pid_device(0), 5000.0f, 0.0f);
status = pid_device_control_location(shoot_get_pid_device(2), 90.0f, 0.0f, true);
status = pid_device_control_location(gimbal_get_pid_device(0), 30.0f, 0.0f, true);
```

同一设备每周期选择一种控制方式。原 `dj_motor_pid_control_location(index, angle)` 保留为发射模块的兼容入口，以 `is_optimize=true` 转调公共接口；只有索引 2 绑定位置环，其他索引不会误用拨弹 PID。

## 单位与行为

- 速度目标与反馈均为**转子 RPM**，使用 `feedback.speed_rpm`，不使用输出轴 `speed_rad_s`。
- 位置目标为**编码器单圈角度，单位度**，使用反馈 `position_deg`（逻辑方向，范围 `[0, 360)`）。`is_optimize=true` 时，归一化目标并将最短路径误差作为位置环目标、反馈传 0；例如当前 359°、目标 1°，误差为 +2°，保留 ±180° 的符号。`false` 时，直接将目标和反馈角度传入位置环，同一例子的误差为 -358°。两种模式均不累计圈数，不换算减速器输出轴角度；直接模式也不支持多圈定位。
- 直接模式会让位置环的测量微分等功能使用真实角度反馈；最短路径模式的位置环反馈为 0。跨越 0°/360° 或运行中切换模式时，两者的微分、积分历史可能产生瞬态，建议初始化时确定模式。
- 位置环输出的 `MaxOut` 单位为 RPM；速度环输出和外部前馈均为电调原始指令。GM6020 是电压指令，M3508/M2006 是电流指令。
- 前馈在速度 PID 输出之后叠加，再按型号限幅：M3508 ±16384、M2006 ±10000、GM6020 ±30000。PID 自身 `MaxOut` 和最终型号限幅是两个独立环节。
- 速度环沿用底盘原来的反馈语义：`dj_motor_get_feedback()` 成功即可计算。位置环额外要求 `feedback.valid`；本层不增加在线超时判断。
- 绑定时不改写电机的 `reversed`，方向仍由电机驱动处理。底盘运动学、前馈来源、遥控器模式及停机路径保留在原模块。

控制接口返回 `err_t`，反馈读取和命令写入错误直接返回；空设备为 `PTR_NULL`，未绑定或不支持的位置环为 `STATE_ERR`，非有限输入为 `ARG_ERR`。参数或反馈检查失败时不写新命令，已有命令不由本层清零。

命令仍通过 `dj_motor_set_command()` 写入组缓存，组内成员本周期写齐才发送。三个发射电机在同一组，不能只写一个电机就期待自动发帧。停机继续调用 `dj_motor_zero_and_flush()`。

## 验证

固件构建：`cmake --build --preset Debug --parallel 8`。

主机回归测试使用真实 PID 算法和电机数据类型，替换 CAN 传输与 DWT 时间源。两个算法分别验证速度环、串级环、跨圈角度、前馈及型号限幅、独立 PID 状态、非法参数和驱动错误返回。

```powershell
cmake -S app/pid_device/tests -B build/pid_device_tests -G Ninja -DCMAKE_C_COMPILER=gcc
cmake --build build/pid_device_tests
ctest --test-dir build/pid_device_tests --output-on-failure
```
