# gimbal_control_vt13

云台控制模块(VT13 遥控器).与 DR16 版结构一致,仅遥控数据源改为全局 `vt13` 对象.

## 电机配置

| 机构 | 电机 | 设备 ID | CAN 总线 | 控制组 |
| --- | --- | --- | --- | --- |
| 偏航 YAW | GM6020 | 1 | CAN1 | 0x200 |
| 俯仰 PITCH | GM6020 | 2 | CAN1 | 0x200 |

## API

| 函数 | 说明 |
| --- | --- |
| `err_t gimbal_control_init(void)` | 初始化 CAN1 总线对象并注册 2 台 GM6020(须在 `CAN_StartAll()` 之前) |
| `void gimbal_speed_pid_init(void)` | 初始化速度环 + 位置环 PID 实例(增量式) |
| `void Gimbal_Mode(void)` | 模式控制主函数,控制任务 2ms 周期调用 |

## 注意事项

- **`Gimbal_Mode()` 当前为空实现(TODO)**.
- **当前未参与编译**:`calculate/CMakeLists.txt` 只编入 `dr16_calculate` 三个模块,`vt13_calculate` 整组未编译.
- 依赖 `vt13_task` 提供的全局 `vt13_t* vt13`;`vt13_task` 也未参与编译,启用本模块需同时启用任务侧.
