@echo off
:: ==============================================================================
:: IMPLATEC: Sincronizador Automático de Refugo Protheus -> Supabase
:: Este arquivo pode ser executado diretamente ou chamado pelo Agendador do Windows
:: ==============================================================================
cd /d "%~dp0"
echo [%date% %time%] Iniciando sincronizacao de refugo... >> sync.log
node sync.js >> sync.log 2>&1
echo [%date% %time%] Sincronizacao finalizada com codigo %errorlevel% >> sync.log
