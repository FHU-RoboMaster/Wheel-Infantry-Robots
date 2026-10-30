# convert

浮点与无符号整数的线性映射量化工具,以及角度归一化宏.主要用于 DM 电机 MIT 协议的参数量化(`modules/motor/dm_motor`).

## 常用功能

### 浮点 <-> 无符号整数量化

把浮点值在 `[x_min, x_max]` 内线性映射到指定位数的无符号整数(及其反变换):

```c
#include "convert.h"

/* 例:速度 [-30, 30] rad/s 量化到 16 位 */
int raw = float_to_uint(10.0f, -30.0f, 30.0f, 16);
float val = uint_to_float(raw, -30.0f, 30.0f, 16);   /* 回到 10.0f */
```

### 角度归一化宏

```c
#define jie_MI 3.141592f                  /* π */

GetAngleBetween360(a)                     /* 归一化到 [0, 360) */
GetAngleBetween180(angle)                 /* 归一化到 (-180, 180] */
Limit_Radian(angle)                       /* 归一化到 (-π, π],步进 ±2π */
TWO_PI                                    /* 2π */
```

## 注意事项

- `float_to_uint()` / `uint_to_float()` 是**纯线性映射,无参数检查**:调用方必须保证 `x_max > x_min`、`bits` 合理,越界输入不做钳位(如输入超出 `[x_min, x_max]` 会得到超范围整数).
- `GetAngleBetween180` 宏的括号覆盖整个三元表达式,复合语句中建议先归一化再参与运算.
- `float_to_uint` 返回 `int` 而非真正的无符号数;DM MIT 协议按位截断使用.
