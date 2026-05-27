# NoCodeFlow 依赖环境一键安装脚本
# 自动安装 Node.js LTS 和 Claude Code CLI
# 使用方式：右键 → 使用 PowerShell 运行，或双击 setup-deps.bat

$ErrorActionPreference = "Stop"
$NPM_REGISTRY = "https://registry.npmmirror.com"
$NODE_MSI_URL = "https://npmmirror.com/mirrors/node/v22.16.0/node-v22.16.0-x64.msi"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NoCodeFlow 环境安装工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: 检查 Node.js
Write-Host "[1/2] 检查 Node.js..." -ForegroundColor Yellow
$nodeInstalled = $false
try {
    $nodeVersion = & node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  Node.js 已安装: $nodeVersion" -ForegroundColor Green
        $nodeInstalled = $true
    }
} catch {}

if (-not $nodeInstalled) {
    Write-Host "  Node.js 未安装，正在下载安装..." -ForegroundColor Yellow

    $msiPath = "$env:TEMP\nodejs-installer.msi"
    Write-Host "  下载中: $NODE_MSI_URL" -ForegroundColor Gray

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $NODE_MSI_URL -OutFile $msiPath -UseBasicParsing
        Write-Host "  下载完成，正在安装（需要管理员权限）..." -ForegroundColor Yellow

        $process = Start-Process "msiexec.exe" -ArgumentList "/i `"$msiPath`" /quiet /norestart" -Wait -PassThru -Verb RunAs
        Remove-Item $msiPath -ErrorAction SilentlyContinue

        if ($process.ExitCode -eq 0) {
            Write-Host "  Node.js 安装成功！" -ForegroundColor Green

            # 刷新 PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

            $nodeVersion = & node --version 2>$null
            Write-Host "  当前版本: $nodeVersion" -ForegroundColor Green
        } else {
            Write-Host "  Node.js 安装失败，退出码: $($process.ExitCode)" -ForegroundColor Red
            Write-Host "  请手动下载安装: https://nodejs.org" -ForegroundColor Red
            Read-Host "按回车键退出"
            exit 1
        }
    } catch {
        Write-Host "  下载或安装失败: $_" -ForegroundColor Red
        Write-Host "  请手动下载安装: https://nodejs.org" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
}

# Step 2: 安装 Claude Code CLI
Write-Host ""
Write-Host "[2/2] 检查 Claude Code CLI..." -ForegroundColor Yellow
$cliInstalled = $false
try {
    $cliVersion = & claude --version 2>$null
    if ($cliVersion) {
        Write-Host "  Claude Code CLI 已安装: $cliVersion" -ForegroundColor Green
        $cliInstalled = $true
    }
} catch {}

if (-not $cliInstalled) {
    Write-Host "  正在安装 Claude Code CLI（可能需要 1-2 分钟）..." -ForegroundColor Yellow
    Write-Host "  使用国内镜像加速..." -ForegroundColor Gray

    try {
        & npm install -g "@anthropic-ai/claude-code" --registry $NPM_REGISTRY

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Claude Code CLI 安装成功！" -ForegroundColor Green

            $cliVersion = & claude --version 2>$null
            Write-Host "  当前版本: $cliVersion" -ForegroundColor Green
        } else {
            Write-Host "  npm 安装失败，尝试使用管理员权限..." -ForegroundColor Yellow

            $npmCmd = "npm install -g @anthropic-ai/claude-code --registry $NPM_REGISTRY"
            $process = Start-Process "cmd.exe" -ArgumentList "/c $npmCmd" -Wait -PassThru -Verb RunAs

            if ($process.ExitCode -eq 0) {
                Write-Host "  Claude Code CLI 安装成功！" -ForegroundColor Green
            } else {
                Write-Host "  Claude Code CLI 安装失败" -ForegroundColor Red
                Write-Host "  请手动在管理员终端中执行:" -ForegroundColor Red
                Write-Host "  npm install -g @anthropic-ai/claude-code" -ForegroundColor Red
                Read-Host "按回车键退出"
                exit 1
            }
        }
    } catch {
        Write-Host "  安装失败: $_" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  所有依赖安装完成！" -ForegroundColor Green
Write-Host "  现在可以启动 NoCodeFlow 使用了" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "按回车键退出"
