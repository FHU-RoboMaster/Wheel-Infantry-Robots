# dr16_task

DR16 遥控器任务.初始化 USART2 上的 DR16 接收逻辑,并周期性刷新解析结果与在线状态.

## 任务流程

```c
void dr16_task(void* argument) {
  static DR16_t dr16_instance;                 /* 静态存储,覆盖任务生命周期 */
  err_t status = DR16_Init(&dr16_instance, &huart2);
  dr16 = &dr16_instance;                       /* 全局指针,供业务模块读取 */
  dr16->thread_alert = xTaskGetCurrentTaskHandle();  /* 绑定任务通知句柄 */

  if (status == OK) status = DR16_Start(dr16);
  ASSERT(status == OK);
  if (status != OK) { vTaskDelete(NULL); return; }   /* 初始化失败自删 */

  for (;;) {
    DR16_Update(dr16, DR16_OFFLINE_TIMEOUT_MS);      /* 超时无合法帧自动置离线 */
  }
}
```

## 对外接口

| 接口 | 说明 |
| --- | --- |
| `void dr16_task(void* argument)` | 任务入口,CubeMX 在 `freertos.c` 中创建同名线程 |
| `DR16_t* dr16` | 全局对象指针,其他模块经 `dr16->dr16_cmd` 读取遥控数据 |

## 依赖模块

- `modules/DR16`:DR16 协议解析(`DR16_Init` / `DR16_Start` / `DR16_Update`),底层走 `bsp_uart` 的 DMA 空闲线接收
- `component/comp_def`:`SIGNAL_DR16_RAW_REDY` 信号位(ISR → 任务通知)

## 注意事项

- 任务阻塞在 `DR16_Update()` 内等待任务通知,数据到达即解析,无固定轮询周期.
- 初始化失败会 `ASSERT` 并 `vTaskDelete(NULL)` 自删;此时全局 `dr16` 指针仍有效但数据不再更新,业务侧应先判在线状态.
- 失败自删后 `thread_alert` 的任务句柄失效,`bsp_uart` 的 RX 回调仍会把数据分发给 `dr16` 内部切片逻辑.
