# gimbal_dynamics

云台动力学模块(预留占位).**当前 `gimbal_dynamics.c/.h` 均为空文件**,规划与 `app/chassis/chassis_dynamics` 对应,为云台两轴(GM6020 偏航/俯仰)提供运动学与前馈计算.

规划接入位置:

- 控制逻辑:`calculate/dr16_calculate/gimbal_control_dr16`(当前 `Gimbal_Mode()` 为空 TODO)
- 任务入口:`task/gimbal_task`
