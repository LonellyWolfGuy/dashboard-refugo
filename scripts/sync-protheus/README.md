# 🔄 Sincronizador Protheus (SQL Server) -> Dashboard de Refugo (Supabase)

Módulo autônomo para coletar dados diários de **Produção** e **Refugo com Motivos** diretamente do banco de dados do Protheus da Implatec e atualizar o Dashboard web em tempo real.

---

## 📁 Arquivos deste Módulo

* `query_teste.sql`: Query SQL para rodar no SSMS e validar os números do dia.
* `sync.js`: Script principal em Node.js (executa queries, formata e faz upsert no Supabase).
* `.env.example`: Modelo de configuração do SQL Server e Supabase.
* `executar-sync.bat`: Script disparador com geração de log em `sync.log`.
* `agendar-tarefa.ps1`: Script PowerShell para cadastrar a rotina no Agendador do Windows.

---

## 🚀 Como Configurar (Passo a Passo)

### 1. Criar o arquivo `.env`
Copie `.env.example` para `.env` e preencha com as credenciais do seu SQL Server e Supabase:
```env
DB_SERVER=192.168.1.xxx
DB_PORT=1433
DB_DATABASE=protheus_producao
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_EMPRESA=01

SUPABASE_URL=https://pjcyfwmhpahzxeuncrff.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

### 2. Testar a Conexão com o Banco
```bash
node sync.js --test-conn
```
Se a conexão estiver correta, ele listará as tabelas `SBC010`, `SD3010`, `SB1010` e `SX5010`.

### 3. Testar a Consulta em Modo Leitura (Dry-Run)
Para ver os valores na tela sem gravar no Supabase:
```bash
# Para a data de teste 07/10/2026:
node sync.js --data 2026-10-07 --dry-run
```

### 4. Sincronizar de Verdade
```bash
# Sincroniza a data informada:
node sync.js --data 2026-10-07

# Sincroniza a rotina padrão (atualiza Ontem D-1 e Hoje D-0):
node sync.js

# Carga histórica do mês inteiro:
node sync.js --mes 10 --ano 2026
```

---

## ⏰ Agendamento Automático no Windows (2 Períodos: 07:00 e 18:00)

O script foi preparado para rodar em dois turnos diários:
* **Às 07:00:** Consolida os apontamentos do turno da noite / fechamento de ontem e inicia a contagem de hoje.
* **Às 18:00:** Consolida o turno diurno e atualiza os totais do dia.

Para cadastrar os dois horários automaticamente no Windows Task Scheduler, abra o PowerShell como Administrador nesta pasta e execute:
```powershell
.\agendar-tarefa.ps1
```
A tarefa executará todos os dias às **07:00** e às **18:00**, gravando o histórico de execuções em `sync.log` e na pasta `logs/sync-AAAA-MM-DD.log`.

---

## 📧 Notificação por E-mail (cPanel SMTP)

A cada sincronização concluída, um e-mail com layout corporativo HTML é enviado aos destinatários configurados contendo:
* Cards de Produção, Refugo e % de Refugo.
* Tabela completa com o detalhamento dos motivos reais e seus pesos em Kg.
* Data/hora e confirmação de gravação no Supabase.

### Configuração no `.env`:
```env
EMAIL_NOTIFICACAO_ATIVA=true
SMTP_HOST=mail.implatec.com.br
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=thiago.gti@implatec.com.br
SMTP_PASSWORD="sua_senha"
EMAIL_REMETENTE=thiago.gti@implatec.com.br
EMAIL_DESTINATARIO=thiago.gti@implatec.com.br, vendas@implatec.com.br, pcp@implatec.com.br
```

### Testar Envio de E-mail:
```bash
node sync.js --test-email
```

---

## 🟢 Badge de Status no Dashboard Web

O script grava o carimbo da última execução na tabela `config` do Supabase. O Dashboard web exibe automaticamente no cabeçalho um badge em tempo real com indicador pulsante:
* Exemplo: `🟢 Protheus: Hoje às 18:00`
* Ao passar o mouse, exibe o tooltip completo com totais, status e horários agendados.
