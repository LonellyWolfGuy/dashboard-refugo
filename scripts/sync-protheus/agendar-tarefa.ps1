# ==============================================================================
# Script PowerShell para criar a Tarefa Agendada no Windows
# Execute como Administrador no servidor ou máquina que tem acesso ao SQL Server
# ==============================================================================

$taskName = "Implatec-Sync-Refugo-Protheus"
$scriptPath = "$PSScriptRoot\executar-sync.bat"

Write-Host "Criando Tarefa Agendada: $taskName..." -ForegroundColor Cyan
Write-Host "Caminho do script: $scriptPath" -ForegroundColor Gray

# Define a ação: executar o arquivo .bat
$action = New-ScheduledTaskAction -Execute "$scriptPath" -WorkingDirectory "$PSScriptRoot"

# Define os dois disparadores diários: 07:00 (abertura/turno da noite) e 18:00 (fechamento comercial)
$trigger1 = New-ScheduledTaskTrigger -Daily -At "07:00"
$trigger2 = New-ScheduledTaskTrigger -Daily -At "18:00"
$triggers = @($trigger1, $trigger2)

# Configurações adicionais: acordar PC se necessário, permitir execução sob demanda
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Registra a tarefa com os dois horários
try {
    # Remove tarefa anterior se existir
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Settings $settings -Description "Sincronização automática diária às 07:00 e 18:00 de Refugo e Produção do Protheus para o Dashboard Supabase"
    Write-Host "✓ Tarefa agendada '$taskName' configurada com sucesso!" -ForegroundColor Green
    Write-Host "Ela executará automaticamente em 2 períodos: às 07:00 e às 18:00 todos os dias." -ForegroundColor Green
} catch {
    Write-Host "Erro ao agendar tarefa: $_" -ForegroundColor Red
}
