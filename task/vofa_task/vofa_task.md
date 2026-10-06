# vofa_task

VOFA+ 调试任务.初始化 USART6 上的 VOFA 收发逻辑,周期性上行发送 firewater 波形数据,并接收上位机 `name=value!` 命令.

## 任务流程

```c
void vofa_task(void* argument) {
  static Vofa_t vofa;
  err_t status = Vofa_Init(&vofa, &huart6);
  vofa.thread_alert = xTaskGetCurrentTaskHandle();
  Vofa_SetCommandCallback(&vofa, OnVofaCommand);   /* 注册命令回调桥接 */

  if (status == OK) status = Vofa_Start(&vofa);
  ASSERT(status == OK);
  if (status != OK) { vTaskDelete(NULL); return; }

  for (;;) {
    (void)Vofa_Send(&vofa, data, ARRAY_LEN(data)); /* 上行 3 通道浮点波形 */
    Vofa_Update(&vofa, VOFA_TASK_UPDATE_TIMEOUT_MS);
  }
}
```

## 命令扩展点

`VofaTask_OnCommand(name, value)` 是弱定义扩展点:Vofa 解析到合法命令后先更新参数表,再调用它.默认实现把 `speed` / `angle` / `mit` 写入上行数组 `data[3]`;业务代码可在其他编译单元提供**同名强定义**接管命令,无需修改 Vofa 驱动或任务循环:

```c
/* 业务侧强定义示例 */
void VofaTask_OnCommand(const char* name, float value) {
  if (strcmp(name, "speed") == 0) target_speed = value;
}
```

## 对外接口

| 接口 | 说明 |
| --- | --- |
| `void vofa_task(void* argument)` | 任务入口,CubeMX 在 `freertos.c` 中创建同名线程 |
| `void VofaTask_OnCommand(const char* name, float value)` | 弱定义命令扩展点,默认处理 speed/angle/mit |
| `float data[3]` | 上行调试通道数组,默认顺序 speed/angle/mit |

## 依赖模块

- `modules/Vofa`:VOFA+ firewater 协议收发,底层走 `bsp_uart`
- `Core/Src/usart.c`:`huart6`

## 注意事项

- 串口使用 `huart6`;头文件注释中写的 USART3 已过时,以代码为准.
- 头文件声明的 `VofaTask_GetSpeed()` / `VofaTask_GetAngle()` / `VofaTask_GetParameter()` 在 `.c` 中**被注释**,当前不可用;读取参数请走 `VofaTask_OnCommand` 强定义自行缓存.
- 上行数组 `data` 是全局变量,可在调试器里直接改值观察波形.
