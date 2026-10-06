# crc_ref

裁判系统串口协议的 CRC8 / CRC16 校验,256 项查表法实现,用于帧数据的发送回填(Append)与接收校验(Verify),被 `modules/game` 的裁判系统解析流程调用.

协议约定:

- CRC8 初值 `0xff`,保存在帧头末尾 1 字节;
- CRC16 初值 `0xffff`,保存在整帧末尾 2 字节,小端存放(低字节在前);
- 传入的 `dwLength` 都包含校验字段本身:CRC8 的计算窗口是前 `dwLength−1` 字节,CRC16 是前 `dwLength−2` 字节;
- 空指针或长度 ≤ 2 时,Verify 返回 `FALSE`,Append 不做任何写入.

## 常用功能

### 接收帧校验

摘自 `modules/game/game.c`:

```c
if (Verify_CRC8_Check_Sum(data, Frame_header_LEN) == 0U) {
    /* 帧头 CRC8 错误,丢弃 */
}
if (Verify_CRC16_Check_Sum(data, (uint32_t)frame_len) == 0U) {
    /* 整帧 CRC16 错误,丢弃 */
}
```

### 发送组帧

在除校验字段以外的所有帧字段填充完成后,依次回填:

```c
uint8_t frame[FRAME_LEN];

/* 1. 填充帧头字段 */
/* 2. 回填帧头 CRC8(帧头末尾 1 字节) */
Append_CRC8_Check_Sum(frame, Frame_header_LEN);
/* 3. 填充 cmd_id 与 data */
/* 4. 回填整帧 CRC16(帧末 2 字节,小端) */
Append_CRC16_Check_Sum(frame, FRAME_LEN);
```

### 分段计算

`Get_CRC8_Check_Sum()` / `Get_CRC16_Check_Sum()` 是底层计算函数,传入上一段的返回值即可继续累积,适合大帧或流式数据:

```c
uint16_t crc = Get_CRC16_Check_Sum(part1, len1, 0xffffu);
crc = Get_CRC16_Check_Sum(part2, len2, crc);
```

## API

| 函数 | 说明 |
| --- | --- |
| `Get_CRC8_Check_Sum(buf, len, crc8)` | 对 len 字节计算 CRC8,crc8 为种子值(新计算传 0xff) |
| `Verify_CRC8_Check_Sum(buf, len)` | 校验帧头末尾已保存的 CRC8,匹配返回 TRUE |
| `Append_CRC8_Check_Sum(buf, len)` | 重算并写入帧头末尾 1 字节 CRC8 |
| `Get_CRC16_Check_Sum(buf, len, crc16)` | 对 len 字节计算 CRC16,buf 为 NULL 时返回 0xffff |
| `Verify_CRC16_Check_Sum(buf, len)` | 校验整帧末尾 2 字节小端 CRC16 |
| `Append_CRC16_Check_Sum(buf, len)` | 重算并按小端写入帧末 2 字节 CRC16 |

## 注意事项

- CRC 初值与 CRC16 的小端字节序属于协议约束,修改后裁判系统帧校验必失败.
- `TRUE`(1u) / `FALSE`(0u) 宏仅为兼容裁判系统旧代码的返回值比较写法,新代码可直接与 0 比较.
- 查表法每字节只做一次索引读取,适合接收解析、中断后处理等高频路径.
- 本模块无外部依赖(仅 stdint/stddef),可独立移植.
