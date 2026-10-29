# pid_incremental

增量式 PID 控制器.输出不直接给出控制量,而是计算相邻两拍之间的增量,再累加到上一拍输出上:

```
Δu(k) = Kp·[e(k) − e(k−1)] + Ki·e(k)·dt + Kd·[e(k) − 2e(k−1) + e(k−2)] / dt
u(k)  = u(k−1) + Δu(k)
```

这种形式天然无积分突变(无扰动切换),适合电机速度环、电流环等执行器连续调节的场合.最终输出 `u(k)` 保存在实例的 `Output` 字段并作为返回值,本拍增量保存在 `Output_Inc`.

## 常用功能

### 速度环控制

```c
#include "pid_incremental.h"

static PIDInstance_jie speed_pid;

void chassis_speed_pid_init(void)
{
    PID_Init_Params_jie(&speed_pid,
                        12.0f, 2.0f, 0.5f,  /* kp / ki / kd */
                        0.002f,             /* dt:USE_TIME 下会被 DWT 实测值覆盖 */
                        12000.0f,           /* 输出限幅 */
                        8000.0f,            /* 积分限幅 */
                        0.0f,               /* 死区 */
                        PID_INC_TRAPEZOID_INTEGRAL | PID_INC_INTEGRAL_LIMIT |
                            PID_INC_DERIVATIVE_ON_MEASUREMENT | PID_INC_FEEDFORWARD);

    /* 改进项默认参数可在初始化后按需覆盖 */
    speed_pid.Kf = 0.05f;  /* 前馈系数 */
}

void chassis_task(void)
{
    float out = PID_Calculate_jie(&speed_pid, target_speed, feedback_speed);
    /* out 即绝对输出(如电流指令) */
    dj_motor_set_command(&motor, (int16_t)out);
}
```

### 获取本拍增量

调试或外层观察时,读取最近一次计算的输出增量:

```c
float inc = PID_Get_Increment_jie(&speed_pid);
```

### 中途复位

清零全部运行时状态(误差历史、输出历史),Kp/Ki/Kd、限幅、滤波等配置保留:

```c
PID_Reset_jie(&speed_pid);
```

## 改进功能

`PID_Init_Params_jie()` 最后一个参数传入改进项,按位或组合,计算时逐项启用:

| 标志位 | 作用 |
| --- | --- |
| `PID_INC_INTEGRAL_LIMIT` | 积分限幅,本轮积分增量钳位到 ±IntegralLimit |
| `PID_INC_DERIVATIVE_ON_MEASUREMENT` | 微分先行,只对测量值微分,避免目标阶跃冲击 |
| `PID_INC_TRAPEZOID_INTEGRAL` | 梯形积分,低采样频率下积分精度更高 |
| `PID_INC_FEEDFORWARD` | 前馈,Kf·(target−last_target)/dt,限幅 ±FeedForward_Max |
| `PID_INC_OUTPUT_FILTER` | 输出低通滤波,抑制执行器指令抖动 |
| `PID_INC_CHANGING_INTEGRATION_RATE` | 变速积分,误差大时削弱/暂停积分 |
| `PID_INC_DERIVATIVE_FILTER` | 微分低通滤波(不完全微分),减少噪声放大 |

`PID_Init_Params_jie()` 会为改进项填入默认值,可按需覆盖:`Derivative_LPF_RC=0.1f`、`Output_LPF_RC=0.05f`、`CoefA=max_output×0.5`、`CoefB=max_output×0.1`、`Kf=0`(禁用前馈)、`FeedForward_Max=max_output×0.5`.

## 注意事项

- `USE_TIME` 由 `pid_incremental.c` 内部定义,依赖 `bsp_dwt.h`.每次计算用 DWT 计数器实测两拍间隔并覆盖 `dt`,外部代码包含头文件时无需定义该宏.
- 进入死区时增量清零但保持上次输出,执行器维持当前控制量;若需要死区内输出归零,请在外层处理.
- 启用 `PID_INC_DERIVATIVE_ON_MEASUREMENT` 后,微分项直接由测量值差分得到,`PID_INC_DERIVATIVE_FILTER` 不参与该分支.
- `PID_Calculate_jie()` 位于高频控制路径,不做空指针检查.
- 本模块功能标志使用 `PID_INC_*` 前缀，可与位置式 PID(`pid_location`)头文件同时包含；旧版增量式代码需将功能标志替换为对应的新名称，标志数值保持不变。

位置式 PID 见 `../pid_location/pid_location.md`.
