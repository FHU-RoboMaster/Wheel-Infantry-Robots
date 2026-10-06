# comp_cmd

组件通用命令与类型定义(仅头文件,无源码).提供全工程统一的**错误码** `err_t`、向量类型,以及把不同遥控器(DR16、VT13 等)解析结果统一的**遥控抽象类型**.

## 错误码 err_t

全工程 BSP 和模块接口的统一返回值:0 表示成功,正值表示等待,负值为各类失败原因.

```c
typedef enum {
  PENDING = 1,        /* 等待中 */
  OK = 0,             /* 操作成功 */
  FAILED = -1,        /* 操作失败 */
  INIT_ERR = -2,      /* 初始化错误 */
  /* ... 共 18 项,覆盖参数/状态/尺寸/超时/空指针等 */
  OUT_OF_RANGE = -17, /* 超出范围 */
} err_t;
```

## 遥控抽象类型

各遥控输入模块(DR16、VT13)把各自协议帧解析为同一套类型,控制逻辑不关心数据来源:

```c
cmd_rc_t rc;                 /* 一帧遥控数据的总览 */

rc.ch.l.x / rc.ch.l.y        /* 左摇杆 x/y */
rc.ch.r.x / rc.ch.r.y        /* 右摇杆 x/y */
rc.sw_l / rc.sw_r            /* 拨杆:CMD_SW_UP / CMD_SW_MID / CMD_SW_DOWN */
rc.mouse                     /* 鼠标:x/y/z 位移 + 左右键 */
rc.key                       /* 键盘:cmd_key_t 枚举项作位索引,如 rc.key & (1u << CMD_KEY_W) */
```

## 注意事项

- DR16 与 VT13 的拨杆枚举**取值不同**:DR16 用 `cmd_switch_pos_t`(UP=1/MID=3/DOWN=2,与 DR16 协议原始值一致),VT13 用 `vt13_cmd_switch_pos_t`(UP=1/MID=2/DOWN=3),混用时不要互相赋值.
- `cmd_key_t` 是按键的**位序号**而非位掩码,判断按键需自行移位.
- 本组件只有头文件,`CMakeLists.txt` 把 `component/` 目录加入了头文件搜索路径,直接 `#include "comp_cmd.h"` 即可.
