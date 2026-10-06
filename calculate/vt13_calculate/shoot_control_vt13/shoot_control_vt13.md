# shoot_control_vt13

发射机构控制模块(VT13 遥控器).与 DR16 版结构一致(2 台 M3508 摩擦轮 + 1 台 M2006 拨弹,CAN1 控制组 0x200),仅遥控数据源改为全局 `vt13` 对象.

## API

| 函数 | 说明 |
| --- | --- |
| `err_t shoot_control_init(void)` | 初始化 CAN1 总线对象并注册 3 台电机(须在 `CAN_StartAll()` 之前) |
| `void shoot_speed_pid_init(void)` | 初始化摩擦轮速度环与拨弹双环 PID |
| `void Shoot_Mode(void)` | 模式控制主函数,控制任务 2ms 周期调用 |

## 与 DR16 版的差异

- **没有** `dj_motor_pid_control_location()` 角度闭环函数及其位置状态结构,拨弹电机只初始化了双环 PID,位置闭环入口需从 DR16 版移植.
- 遥控数据源为 `vt13->cmd`(而非 `dr16->dr16_cmd`).

## 注意事项

- **`Shoot_Mode()` 当前为空实现(TODO)**.
- **当前未参与编译**:`calculate/CMakeLists.txt` 只编入 `dr16_calculate` 三个模块,`vt13_calculate` 整组未编译.
- 启用本模块需同时启用 `vt13_task`(同样未编译),并与 `game_task` 二选一占用 USART3.
