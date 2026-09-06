# ═══════════════════════════════════════════════════════════════
#  Pizza Hub — Windows'ga kirganda avtomatik ishga tushirish
# ═══════════════════════════════════════════════════════════════
#
#  Yoqish:   npm run autostart:on
#  O'chirish: npm run autostart:off
#
#  Startup papkasiga yorliq qo'yadi — administrator huquqi kerak emas.
#  Yorliq `scripts/run-hidden.vbs` ni chaqiradi, u esa oynasiz
#  `node start.js` ni ishga tushiradi.

param(
    [ValidateSet('install', 'remove', 'status')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'

$projectDir   = Split-Path -Parent $PSScriptRoot
$launcher     = Join-Path $PSScriptRoot 'run-hidden.vbs'
$startupDir   = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir 'Pizza Hub.lnk'

function Install-Autostart {
    if (-not (Test-Path $launcher)) {
        throw "Ishga tushirgich topilmadi: $launcher"
    }

    $shell    = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath       = 'wscript.exe'
    $shortcut.Arguments        = """$launcher"""
    $shortcut.WorkingDirectory = $projectDir
    $shortcut.Description      = 'Pizza Hub — Telegram Mini App (avtomatik ishga tushish)'
    $shortcut.Save()

    Write-Host "Avtomatik ishga tushish YOQILDI" -ForegroundColor Green
    Write-Host "  Yorliq: $shortcutPath"
    Write-Host "  Endi kompyuterga kirganingizda bot va ilova o'zi ishga tushadi."
}

function Remove-Autostart {
    if (Test-Path $shortcutPath) {
        Remove-Item $shortcutPath -Force
        Write-Host "Avtomatik ishga tushish O'CHIRILDI" -ForegroundColor Yellow
        Write-Host "  Ishlab turgan jarayonlarni to'xtatish uchun: npm stop"
    }
    else {
        Write-Host "Avtomatik ishga tushish allaqachon o'chiq." -ForegroundColor Yellow
    }
}

function Get-AutostartStatus {
    if (Test-Path $shortcutPath) {
        Write-Host "Holat: YOQILGAN" -ForegroundColor Green
        Write-Host "  $shortcutPath"
    }
    else {
        Write-Host "Holat: O'CHIQ" -ForegroundColor Yellow
    }

    $urlFile = Join-Path $projectDir 'logs\current-url.txt'
    if (Test-Path $urlFile) {
        Write-Host "`nOxirgi manzil:" -ForegroundColor Cyan
        Get-Content $urlFile | Select-Object -First 1 | ForEach-Object { Write-Host "  $_" }
    }
}

switch ($Action) {
    'install' { Install-Autostart }
    'remove'  { Remove-Autostart }
    'status'  { Get-AutostartStatus }
}
