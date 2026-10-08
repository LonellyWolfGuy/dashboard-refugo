# ==============================================================================
# Script PowerShell para criar a Tarefa Agendada no Windows
# ==============================================================================

$taskName = "Implatec-Sync-Refugo-Protheus"
$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = "C:\scripts\sync-protheus" }
$scriptPath = Join-Path $scriptDir "executar-sync.bat"

Write-Host "Configurando tarefa agendada: $taskName" -ForegroundColor Cyan
Write-Host "Caminho: $scriptPath" -ForegroundColor Gray

$action = New-ScheduledTaskAction -Execute $scriptPath -WorkingDirectory $scriptDir
$trigger1 = New-ScheduledTaskTrigger -Daily -At "07:00"
$trigger2 = New-ScheduledTaskTrigger -Daily -At "18:00"
$triggers = @($trigger1, $trigger2)

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Settings $settings -Description "Sincronizacao Protheus para Supabase"
    Write-Host "[OK] Tarefa agendada com sucesso para 07:00 e 18:00!" -ForegroundColor Green
}
catch {
    Write-Host "Falha ao registrar tarefa:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
