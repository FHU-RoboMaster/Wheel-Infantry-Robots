# comp_utils

自定义的小工具集:常用宏 + 数学工具函数.全工程通用,`comp_utils.c` 由 `CMakeLists.txt` 编入工程.

## 常用功能

### 限幅与符号

```c
#include "comp_utils.h"

float out = abs_clampf(x, 16384.0f);   /* 钳位到 ±limit,返回值 */
clampf(&out, -100.0f, 100.0f);         /* 钳位到 [lo, hi],指针原地修改 */
float s   = signf(x);                  /* 符号函数(见注意事项) */
```

### 循环值运算

用于没有负数、在一定范围内循环变化的值(如编码器角度、yaw 累计角):

```c
/* 误差:0.1π 与 1.9π 实际只差 -0.2π(range = 2π 时) */
float err = circle_error(sp, fb, M_2PI);

/* 循环加法:1.5π + 1.5π = 1π */
circle_add(&angle, delta, M_2PI);

/* 循环值取反 */
circle_reverse(&angle);
```

### 断言与校验

`ASSERT` 与 `VERIFY` 都在 `MCU_DEBUG_BUILD`(CMake Debug 配置注入)下检查表达式,失败进入 `verify_failed()` 死循环;区别在 Release 下的行为:

```c
ASSERT(ptr != NULL);        /* Release:表达式完全不执行,整体忽略 */
VERIFY(HAL_CAN_Start(hcan) == HAL_OK);  /* Release:HAL 调用仍执行,只忽略结果检查 */
```

### 其他常用宏

```c
MAX(a, b) / MIN(a, b)              /* 表达式安全,只求值一次(GCC typeof 扩展) */
CONTAINER_OF(ptr, type, member)    /* 由成员指针反推容器地址 */
ARRAY_LEN(array)                   /* 数组长度 */
RM_UNUSED(x)                       /* 压制未使用参数警告 */
M_2PI                              /* 2π(float) */
```

## 注意事项

- `signf()` 当前实现中**负数返回 0.0f**(而非 -1.0f),仅 0 返回 0、正数返回 1.0f,按符号三态使用前需确认是否符合预期.
- `clampf()` 的 `hi > lo` 检查是 `ASSERT`,Release 下不生效,调用方需自行保证区间合法.
- `MCU_DEBUG_BUILD` 由 CMake 配置注入,**禁止**在头文件或源码里手工定义.
- `inv_sqrtf()` 当前实现就是 `1.0f / sqrtf(x)`,代码中保留的快速倒数平方根分支未启用.
- `verify_failed()` 是死循环,断言失败即停机,用于开发期捕获非法状态.
