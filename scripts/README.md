# scripts 目录说明

本目录存放仓库的一键代码格式化脚本，用于统一本仓库自有代码的代码风格。

## 脚本列表

| 脚本 | 平台 | 说明 |
| --- | --- | --- |
| `format.sh` | Linux / macOS / Git Bash | Bash 版一键格式化脚本 |
| `format.ps1` | Windows PowerShell | PowerShell 版一键格式化脚本 |

两个脚本逻辑完全一致，任选其一即可。

## 功能

- 使用仓库根目录的 `.clang-format` 配置格式化代码（`clang-format --style=file -i`）。
- 处理范围为本仓库自有代码目录：`app`、`arithmetic`、`bsp`、`calculate`、`component`、`task`、`tool`，仅处理 `.c` `.h` `.cc` `.cpp` `.hpp` 文件。
- **不会改动** `Core/`、`Drivers/`、`Middlewares/`（CubeMX/HAL 生成代码）和 `modules/`（submodule）。
- 脚本内部会自动切换到仓库根目录，因此在任意位置调用都能正确工作。
- 格式化完成后会输出处理的文件数量，可用 `git diff` 查看改动。

## 环境要求

需要 clang-format **23.1.1**（与 CI 版本一致），推荐通过 pip 安装：

```bash
pip install clang-format==23.1.1
```

安装后终端中应能执行 `clang-format --version` 并显示 23.1.1。脚本启动时会先检查该命令是否存在，缺失时报错退出。

## 使用方法

### Windows（PowerShell）

在仓库根目录或任意位置执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\format.ps1
```

如果本机执行策略允许运行本地脚本（`RemoteSigned`），也可以直接：

```powershell
.\scripts\format.ps1
```

### Linux / macOS / Git Bash

```bash
bash scripts/format.sh
```

首次使用前如需直接执行，可添加可执行权限：

```bash
chmod +x scripts/format.sh
./scripts/format.sh
```

## 典型流程

```bash
# 1. 安装/确认 clang-format 版本
clang-format --version   # 应输出 23.1.1

# 2. 一键格式化
./scripts/format.sh      # Windows 下用 .\scripts\format.ps1

# 3. 检查并提交
git diff
git add -A
git commit -m "style:统一代码的格式化"
```

## 注意事项（编码问题，务必阅读）

本项目曾因文件编码问题导致格式化失败，请注意：

1. **`.clang-format` 必须保存为无 BOM 的 UTF-8**。clang-format 读取到 BOM 会报 `invalid argument` 错误，导致格式化失败。
2. **`format.ps1` 必须保存为带 BOM 的 UTF-8**。否则 Windows PowerShell 5.1 中脚本内的中文注释和提示信息会乱码。
3. 若脚本报告「N 个文件格式化失败」，最常见的原因就是 `.clang-format` 被编辑器重新保存成了带 BOM 的编码，请检查并改回无 BOM 的 UTF-8 后重试。
