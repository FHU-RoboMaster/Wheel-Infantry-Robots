# pid_location

位置式 PID 控制器(基于 Wang Hongxi / HNU YueLu EC 开源实现修改).直接由误差计算绝对控制量:

```
u(k) = Kp·e(k) + Ki·Σ[e(i)·dt] + Kd·[e(k) − e(k−1)] / dt
```

适合角度环等需要明确绝对输出的场合,也可用于速度环.控制周期 `dt` 由 `bsp_dwt` 的 DWT 计数器在每次 `PIDCalculate()` 时自动实测,无需手动传入.

## 常用功能

### 底盘速度环

摘自 `calculate/dr16_calculate/chassis_control_dr16/chassis_control.c`:

```c
#include "pid_location.h"

static PIDInstance pid_speed[4];

static void chassis_speed_pid_init_single(PIDInstance* pid, float kp, float ki,
                                          float kd, float max_out)
{
    PIDInit(pid, kp, ki, kd, max_out,
            3000.0f,           /* 积分限幅 */
            0.0f,              /* 死区 */
            PID_Integral_Limit | PID_Derivative_On_Measurement |
                PID_OutputFilter | PID_DerivativeFilter,
            0.0f, 0.0f,        /* 变速积分 CoefA / CoefB(未启用) */
            0.0002f, 0.0002f); /* 输出滤波 RC / 微分滤波 RC */
}

void chassis_control_task(void)
{
    float motor_current =
        PIDCalculate(&pid_speed[motor_index], current_speed, target_speed);
    dj_motor_set_command(&chassis_motors[motor_index], (int16_t)motor_current);
}
```

### 堆上注册实例

不想静态持有实例时,用 `PIDRegister()` 在堆上分配并初始化(内部 `malloc` + 清零,当前未提供释放接口,嵌入式场景优先用静态实例 + `PIDInit()`):

```c
PIDInstance* pid = PIDRegister(10.0f, 1.0f, 0.0f, 16384.0f, 3000.0f, 0.0f,
                               PID_Integral_Limit, 0.0f, 0.0f, 0.0f, 0.0f);
```

### 堵转检测

初始化时启用 `PID_ErrorHandle`,每拍自动检测:

- 输出接近 0(`|Output| < MaxOut×0.001`)或 `|ref| < 0.0001` 时不计数;
- `|ref − last_measure| / |ref| > 0.95`(反馈长期跟不上目标)时 `ERRORCount++`,否则清零;
- `ERRORCount > 500` 时置位 `ERRORHandler.ERRORType = PID_MOTOR_BLOCKED_ERROR`.

检测到堵转只置位标志,不做任何自动处理,上层需自行决策(如反向解堵、清积分或停机).

## 改进功能

`PIDInit()` 的 `improve_flags` 参数按位或组合,计算时逐项启用:

| 标志位 | 作用 |
| --- | --- |
| `PID_Integral_Limit` | 积分限幅/抗饱和,输出饱和且误差同向时清零本轮积分 |
| `PID_Derivative_On_Measurement` | 微分先行,只对测量值微分 |
| `PID_Trapezoid_Intergral` | 梯形积分 |
| `PID_Proportional_On_Measurement` | 比例先行(枚举已定义,当前计算流程未实现,预留) |
| `PID_OutputFilter` | 输出低通滤波 |
| `PID_ChangingIntegrationRate` | 变速积分,仅在积分呈累积趋势(Err·Iout>0)时生效 |
| `PID_DerivativeFilter` | 微分低通滤波 |
| `PID_ErrorHandle` | 电机堵转检测 |

变速积分系数的生效区间:`|e| ≤ CoefB` 全速积分,`CoefB < |e| ≤ CoefA+CoefB` 线性削弱,`|e| > CoefA+CoefB` 不积分.

## 注意事项

- `PIDCalculate()` 位于高频控制路径,不做空指针检查.
- 进入死区会同时清零 ITerm 与 Output,输出不会保持,适合定位类控制;若需保持力矩,需另行设计保持项.
- 输出限幅是最后一道保护,所有改进环节计算完成后都会经过它.
- 本模块枚举与增量式 PID(`pid_incremental`)的同名字面量较多,跨模块混用时使用各自的枚举类型.

增量式 PID 见 `../pid_incremental/pid_incremental.md`.
