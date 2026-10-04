# 一键格式化本仓库自有代码(使用根目录 .clang-format)。
# 范围:app arithmetic bsp calculate component task tool
# 不动 Core/、Drivers/、Middlewares/(CubeMX/HAL 生成代码)和 modules/(submodule)。
#
# 需要 clang-format 23.1.1(与 CI 一致):pip install clang-format==23.1.1
# 编码要求:本脚本必须保存为带 BOM 的 UTF-8(否则 Windows PowerShell 5.1 中文乱码),
# 而 .clang-format 必须是无 BOM 的 UTF-8(clang-format 读到 BOM 会报 invalid argument)。
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Get-Command clang-format -ErrorAction SilentlyContinue)) {
    Write-Error '未找到 clang-format,请先安装: pip install clang-format==23.1.1'
}
clang-format --version

$files = @(git ls-files app arithmetic bsp calculate component task tool |
    Where-Object { $_ -match '\.(c|h|cc|cpp|hpp)$' })
if ($files.Count -eq 0) {
    Write-Host '没有找到需要格式化的源文件'
    exit 0
}

$failed = @()
foreach ($f in $files) {
    clang-format --style=file -i $f
    if ($LASTEXITCODE -ne 0) { $failed += $f }
}
if ($failed.Count -gt 0) {
    Write-Host ("{0} 个文件格式化失败,常见原因是 .clang-format 被存成带 BOM 的编码:" -f $failed.Count)
    $failed
    exit 1
}
Write-Host ("已格式化 {0} 个文件,可用 git diff 查看改动" -f $files.Count)
