# shoot_dynamics

发射机构动力学模块(预留占位).**当前 `shoot_dynamics.c/.h` 均为空文件**,规划与 `app/chassis/chassis_dynamics` 对应,为发射机构(2 台 M3508 摩擦轮 + 1 台 M2006 拨弹)提供运动学与前馈计算.

规划接入位置:

- 控制逻辑:`calculate/dr16_calculate/shoot_control_dr16`(当前 `Shoot_Mode()` 为空 TODO)
- 任务入口:`task/shoot_task`(当前未参与编译)
