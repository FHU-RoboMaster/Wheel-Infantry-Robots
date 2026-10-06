# process

通用数值处理宏集(仅头文件,无源码).覆盖限幅、死区、插值、映射、位操作、字节序、对齐、范围判断等高频小工具,全部用 GCC 语句表达式(`({ ... })`)实现,参数只求值一次.

## 常用功能

### 限幅与符号

```c
#include "process.h"

float v = CONSTRAIN(x, -100.0f, 100.0f);  /* 限幅到 [min, max] */
CONSTRAIN_PTR(&v, -100.0f, 100.0f);       /* 指针版,原地修改 */
CONSTRAIN_01(x)                           /* 限幅到 [0, 1] */
CONSTRAIN_PM1(x)                          /* 限幅到 [-1, 1] */
CONSTRAIN_PI(x)                           /* 限幅到 [-π, π] */
ABS(x) / ABS_PTR(&v)                      /* 绝对值 */
SIGN(x)                                   /* 符号:-1 / 0 / 1(与 comp_utils 的 signf 不同) */
```

### 死区、插值与映射

```c
DEADZONE(x, 0.05f)                        /* |x| < 阈值时返回 0 */
LERP(a, b, t)                             /* 线性插值 */
LERP_CLAMP(a, b, t)                       /* 插值且 t 限幅到 [0,1] */
MAP(x, in_min, in_max, out_min, out_max)  /* 区间映射 */
MAP_CLAMP(x, ...)                         /* 映射并限幅到目标区间 */
ROUND(x)                                  /* 四舍五入 */
```

### 位操作与字节序

```c
SET_BITS(reg, bits) / CLEAR_BITS(reg, bits)
BIT_IS_SET(reg, bit) / BIT_IS_CLEARED(reg, bit)
HIGH_BYTE(x) / LOW_BYTE(x) / MAKE_WORD(h, l)          /* 8 位 <-> 16 位 */
HIGH_WORD(x) / LOW_WORD(x) / MAKE_DWORD(h, l)         /* 16 位 <-> 32 位 */
ALIGN_UP(x, n) / IS_ALIGNED(ptr, n)                   /* 对齐(n 须为 2 的幂) */
```

### 判断与其他

```c
IS_IN_RANGE(x, min, max)              /* 左闭右开 */
IS_IN_RANGE_INCLUSIVE(x, min, max)    /* 双闭区间 */
IS_CLOSE(a, b, tol)                   /* |a-b| < tol */
IS_EQUAL_FLOAT(a, b)                  /* 浮点近似相等(容差 1e-4) */
SAME_SIGN(a, b) / DIFFERENT_SIGN(a, b)
MAX / MIN / MAX3 / MIN3 / SQUARE / CUBE
SATURATE_ADD(a, b, max) / SATURATE_SUB(a, b, min)
ARRAY_SIZE(arr) / DIV_CEIL(a, b) / OFFSET_OF(type, member)
```

## 注意事项

- 语句表达式宏依赖 **GCC 扩展**,不可移植到 MSVC 等编译器;工程目标为 arm-gcc,可放心使用.
- 与 `component/comp_utils.h` 存在**同名宏重复**:`MAX` / `MIN` / `M_2PI` 两处都定义,同时包含两个头文件时以包含顺序为准,建议统一到一处.
- `comp_utils.h` 的 `ARRAY_LEN` 与本文件的 `ARRAY_SIZE` 等价;`SIGN` 宏与 `comp_utils.h` 的 `signf()` 行为不同(前者负数返回 -1,后者当前负数返回 0).
