#!/usr/bin/env node
/**
 * ==============================================================================
 * IMPLATEC - SINCRONIZADOR PROTHEUS (SQL SERVER) -> SUPABASE (DASHBOARD REFUGO)
 * ==============================================================================
 * Consulta dados diários de produção e refugo diretamente no banco do Protheus
 * e sincroniza de forma idempotente com a tabela 'registros' no Supabase.
 *
 * Recursos adicionais:
 * - Gravação de logs em arquivo diário (logs/sync-YYYY-MM-DD.log).
 * - Envio de e-mail de notificação (cPanel SMTP) com resumo da operação.
 * - Registro do status de última sincronização na tabela 'config' do Supabase.
 *
 * Uso:
 *   node sync.js                     -> Sincroniza ontem e hoje (07:00 e 18:00)
 *   node sync.js --data 2026-10-07   -> Sincroniza uma data específica
 *   node sync.js --mes 10 --ano 2026 -> Sincroniza todos os dias com movimento no mês
 *   node sync.js --dry-run           -> Apenas consulta e exibe sem gravar no Supabase
 *   node sync.js --test-conn         -> Testa a conexão com o SQL Server
 *   node sync.js --test-email        -> Envia um e-mail de teste para validar o SMTP cPanel
 * ==============================================================================
 */

import sql from "mssql";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import fs from "fs";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env do mesmo diretório
const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  console.warn("\x1b[33m[AVISO] Arquivo .env não encontrado em " + envPath + "\x1b[0m");
  console.warn("\x1b[33mCopie o arquivo .env.example para .env e preencha com as credenciais do SQL Server e Supabase.\x1b[0m\n");
}
dotenv.config({ path: envPath });

// ─── Gerenciamento de Logs em Arquivo ─────────────────────────────────────────
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  try { fs.mkdirSync(logsDir, { recursive: true }); } catch (_) {}
}

const hojeLogData = new Date().toISOString().slice(0, 10);
const arquivoLogDia = path.join(logsDir, `sync-${hojeLogData}.log`);
const arquivoLogGeral = path.join(__dirname, "sync.log");

const bufferLogs = [];

function gravarLinhaArquivo(textoLimpo) {
  const linhaComData = `[${new Date().toLocaleString("pt-BR")}] ${textoLimpo}\n`;
  try {
    fs.appendFileSync(arquivoLogDia, linhaComData, "utf8");
    fs.appendFileSync(arquivoLogGeral, linhaComData, "utf8");
  } catch (_) {}
}

// ─── Cores para Log no Terminal ──────────────────────────────────────────────
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

function log(msg, color = colors.reset) {
  const time = new Date().toLocaleTimeString("pt-BR");
  const consoleLine = `${colors.dim}[${time}]${colors.reset} ${color}${msg}${colors.reset}`;
  console.log(consoleLine);
  
  // Remove códigos ANSI para gravar no arquivo
  const textoLimpo = msg.replace(/\x1b\[[0-9;]*m/g, "");
  bufferLogs.push(`[${time}] ${textoLimpo}`);
  gravarLinhaArquivo(textoLimpo);
}

// ─── Validação de Variáveis de Ambiente ───────────────────────────────────────
if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER) {
  log("AVISO: Configure os campos DB_SERVER, DB_DATABASE e DB_USER no arquivo .env!", colors.yellow);
}

const dbConfig = {
  server: process.env.DB_SERVER || "localhost",
  port: parseInt(process.env.DB_PORT || "1433", 10),
  database: process.env.DB_DATABASE || "protheus",
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "",
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== "false",
    enableArithAbort: true,
    requestTimeout: 30000,
  },
};

const empresa = process.env.DB_EMPRESA || "01";
const tabelaPrefixo = `${empresa}0`; // Ex: SBC010, SD3010, SX5010, SB1010

const supabaseUrl = process.env.SUPABASE_URL || "https://pjcyfwmhpahzxeuncrff.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// ─── Argumentos de Linha de Comando ──────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isTestConn = args.includes("--test-conn");
const isTestEmail = args.includes("--test-email");

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const argData = getArgValue("--data"); // 'YYYY-MM-DD'
const argMes = getArgValue("--mes");   // '1-12'
const argAno = getArgValue("--ano");   // '2026'

// ─── Conexão com Supabase ────────────────────────────────────────────────────
let supabase = null;
if (!isDryRun && !isTestConn && !isTestEmail) {
  if (!supabaseUrl || !supabaseKey) {
    log("ERRO: Credenciais do Supabase não encontradas no arquivo .env!", colors.red);
    process.exit(1);
  }
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Função de Teste de Conexão com SQL Server ──────────────────────────────
async function testConnection() {
  log("Testando conexão com o SQL Server...", colors.cyan);
  try {
    const pool = await sql.connect(dbConfig);
    log("✓ Conectado com sucesso ao SQL Server!", colors.green);
    
    const result = await pool.request().query(`
      SELECT 
        SERVERPROPERTY('MachineName') AS Servidor,
        SERVERPROPERTY('Edition') AS Edicao,
        DB_NAME() AS BancoAtual;
    `);
    console.table(result.recordset);

    log(`Testando existência das tabelas com sufixo ${tabelaPrefixo}...`, colors.cyan);
    const tabelas = ["SBC", "SD3", "SB1", "SX5"];
    for (const tab of tabelas) {
      const nomeTab = `${tab}${tabelaPrefixo}`;
      const check = await pool.request().query(`
        SELECT COUNT(*) as existe FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${nomeTab}'
      `);
      if (check.recordset[0].existe > 0) {
        log(`✓ Tabela ${nomeTab} encontrada.`, colors.green);
      } else {
        log(`⚠ ATENÇÃO: Tabela ${nomeTab} NÃO foi encontrada no banco!`, colors.yellow);
      }
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    log(`✗ Falha ao conectar: ${err.message}`, colors.red);
    process.exit(1);
  }
}

// ─── Notificação por E-mail (cPanel SMTP) ───────────────────────────────────
function criarTransportadorEmail() {
  const host = process.env.SMTP_HOST || "mail.implatec.com.br";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE !== "false"; // 465 = true, 587 = false
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false, // Evita erros com certificados autoassinados/cPanel
    },
  });
}

async function enviarEmailRelatorio(resumo) {
  if (process.env.EMAIL_NOTIFICACAO_ATIVA !== "true") {
    return;
  }

  const transporter = criarTransportadorEmail();
  if (!transporter) {
    log("⚠ Envio de e-mail ativo, mas SMTP_USER ou SMTP_PASSWORD não estão preenchidos.", colors.yellow);
    return;
  }

  const rawDestinatario = process.env.EMAIL_DESTINATARIO || process.env.SMTP_USER;
  const listaDestinatarios = rawDestinatario
    ? rawDestinatario.split(",").map((e) => e.trim()).filter(Boolean)
    : [process.env.SMTP_USER];
  const remetente = process.env.EMAIL_REMETENTE || process.env.SMTP_USER;

  const dataHoraFormatada = new Date().toLocaleString("pt-BR");

  let htmlMotivos = "";
  if (resumo.motivos && resumo.motivos.length > 0) {
    htmlMotivos = `
      <h3 style="color: #334155; margin-top: 20px; font-size: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">📋 Detalhamento dos Motivos de Refugo:</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: left;">
            <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Motivo</th>
            <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1; text-align: right;">Quantidade (Kg)</th>
          </tr>
        </thead>
        <tbody>
          ${resumo.motivos.map(m => `
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${m.motivo}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #b91c1c;">${m.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} Kg</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  let htmlRankingProdutos = "";
  if (resumo.rankingProdutos && resumo.rankingProdutos.length > 0) {
    const top5 = resumo.rankingProdutos.slice(0, 5);
    htmlRankingProdutos = `
      <h3 style="color: #334155; margin-top: 24px; font-size: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
        🔥 Top 5 Produtos com Maior Rejeição (Últimos 30 Dias):
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: left;">
            <th style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1;">Produto / Ferramenta</th>
            <th style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: right;">Produção</th>
            <th style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: right;">Refugo (Kg)</th>
            <th style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: right;">% Rejeição</th>
          </tr>
        </thead>
        <tbody>
          ${top5.map(p => `
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">
                <strong style="color: #1e293b;">${p.produto}</strong> — ${p.descricao}<br>
                <span style="font-size: 11px; color: #64748b;">🔧 ${p.ferramentas}</span>
              </td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #334155;">
                ${p.kgProducao.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} Kg
              </td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #b91c1c;">
                ${p.kgRefugo.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} Kg
              </td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${p.rejeicaoPct > 30 ? "#b91c1c" : p.rejeicaoPct > 20 ? "#d97706" : "#2563eb"};">
                ${p.rejeicaoPct.toFixed(1)}%
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  const htmlCorpo = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #334155; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e3a8a, #0284c7); padding: 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 24px; }
        .kpis { display: flex; gap: 12px; margin-bottom: 20px; }
        .kpi { flex: 1; padding: 14px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; text-align: center; }
        .kpi-title { font-size: 11px; text-transform: uppercase; font-weight: 600; color: #64748b; margin-bottom: 4px; }
        .kpi-value { font-size: 20px; font-weight: 800; }
        .kpi-prod { color: #059669; }
        .kpi-ref { color: #dc2626; }
        .kpi-pct { color: #d97706; }
        .footer { padding: 16px; background-color: #f1f5f9; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background-color: #dcfce7; color: #15803d; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>IMPLATEC — Controle de Refugo</h1>
          <p>Relatório de Sincronização Automática Protheus</p>
        </div>
        <div class="content">
          <div style="margin-bottom: 16px; text-align: right;">
            <span class="badge">✓ Sincronizado com Sucesso</span>
          </div>

          <p style="font-size: 14px; margin-top: 0;">
            A sincronização dos dados do <strong>Protheus (SQL Server)</strong> para o <strong>Dashboard de Refugo (Supabase)</strong> foi executada com sucesso.
          </p>

          <table style="width: 100%; margin: 16px 0; border-collapse: separate; border-spacing: 8px;">
            <tr>
              <td style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center; width: 33%;">
                <div style="font-size: 11px; color: #166534; font-weight: 600; text-transform: uppercase;">🏭 Produção</div>
                <div style="font-size: 18px; font-weight: 800; color: #15803d; margin-top: 4px;">${resumo.producao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} Kg</div>
              </td>
              <td style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; text-align: center; width: 33%;">
                <div style="font-size: 11px; color: #991b1b; font-weight: 600; text-transform: uppercase;">♻️ Refugo</div>
                <div style="font-size: 18px; font-weight: 800; color: #b91c1c; margin-top: 4px;">${resumo.refugo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} Kg</div>
              </td>
              <td style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; text-align: center; width: 33%;">
                <div style="font-size: 11px; color: #92400e; font-weight: 600; text-transform: uppercase;">📊 % Refugo</div>
                <div style="font-size: 18px; font-weight: 800; color: #d97706; margin-top: 4px;">${resumo.pctRefugo}%</div>
              </td>
            </tr>
          </table>

          ${htmlMotivos}
          ${htmlRankingProdutos}

          <div style="margin-top: 24px; padding: 12px; background-color: #f8fafc; border-left: 4px solid #0284c7; border-radius: 4px; font-size: 12px; color: #475569;">
            <strong>Data Referência:</strong> ${resumo.data}<br>
            <strong>Registros Processados:</strong> ${resumo.diasCount || 1} dia(s)<br>
            <strong>Horário da Execução:</strong> ${dataHoraFormatada}<br>
            <strong>Ambiente:</strong> Produção (Servidor Protheus)
          </div>
        </div>
        <div class="footer">
          Dashboard de Refugo Industrial — Implatec &bull; Sincronização automática 07:00 / 18:00
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    log(`Enviando e-mail de notificação para ${listaDestinatarios.length} destinatário(s) (${listaDestinatarios.join(", ")})...`, colors.cyan);
    await transporter.sendMail({
      from: `"Dashboard Refugo Implatec" <${remetente}>`,
      to: listaDestinatarios,
      subject: `[IMPLATEC] Refugo Sincronizado - ${resumo.data} (${resumo.pctRefugo}%)`,
      html: htmlCorpo,
    });
    log("✓ E-mail de notificação enviado com sucesso!", colors.green);
  } catch (err) {
    log(`⚠ Falha ao enviar e-mail: ${err.message}`, colors.yellow);
  }
}

async function testEmail() {
  log("Testando envio de e-mail via SMTP cPanel...", colors.cyan);
  const transporter = criarTransportadorEmail();
  if (!transporter) {
    log("ERRO: Preencha SMTP_USER e SMTP_PASSWORD no arquivo .env!", colors.red);
    process.exit(1);
  }

  const rawDestinatario = process.env.EMAIL_DESTINATARIO || process.env.SMTP_USER;
  const listaDestinatarios = rawDestinatario
    ? rawDestinatario.split(",").map((e) => e.trim()).filter(Boolean)
    : [process.env.SMTP_USER];
  const remetente = process.env.EMAIL_REMETENTE || process.env.SMTP_USER;

  try {
    await transporter.verify();
    log("✓ Conexão SMTP autenticada com sucesso!", colors.green);

    await transporter.sendMail({
      from: `"Teste Dashboard Implatec" <${remetente}>`,
      to: listaDestinatarios,
      subject: "[TESTE] Conexão SMTP cPanel — Dashboard de Refugo",
      text: "Este é um e-mail de teste confirmando que a notificação automática do Dashboard de Refugo está funcionando perfeitamente para todos os destinatários configurados!",
    });

    log(`✓ E-mail de teste enviado com sucesso para ${listaDestinatarios.join(", ")}!`, colors.green);
    process.exit(0);
  } catch (err) {
    log(`✗ Erro ao enviar e-mail de teste: ${err.message}`, colors.red);
    process.exit(1);
  }
}

// ─── Query de Refugo do Dia (SBC + SX5) ───────────────────────────────────────
async function consultarRefugo(pool, dataProtheus) {
  const query = `
    SELECT 
      ISNULL(NULLIF(RTRIM(X5.X5_DESCRI), ''), 'Outros') AS motivo,
      RTRIM(SBC.BC_MOTIVO) AS cod_motivo,
      CAST(SUM(SBC.BC_QTDDEST) AS NUMERIC(12, 2)) AS quantidade
    FROM SBC${tabelaPrefixo} SBC
    LEFT JOIN SX5${tabelaPrefixo} X5 
      ON X5.X5_TABELA = '43' 
     AND RTRIM(X5.X5_CHAVE) = RTRIM(SBC.BC_MOTIVO)
     AND X5.D_E_L_E_T_ = ' '
    WHERE SBC.BC_LOCAL = '55'
      AND SBC.BC_DATA = @Data
      AND SBC.D_E_L_E_T_ = ' '
    GROUP BY X5.X5_DESCRI, SBC.BC_MOTIVO
    ORDER BY quantidade DESC;
  `;

  const request = pool.request();
  request.input("Data", sql.Char(8), dataProtheus);
  const result = await request.query(query);

  const motivos = result.recordset.map((row) => ({
    id: `mot_${crypto.randomUUID().slice(0, 8)}`,
    motivo: row.motivo.trim(),
    quantidade: Number(row.quantidade),
  }));

  const totalRefugo = motivos.reduce((acc, m) => acc + m.quantidade, 0);
  return { motivos, totalRefugo: Number(totalRefugo.toFixed(2)) };
}

// ─── Query de Produção do Dia (SD3 + SB1) ────────────────────────────────────
async function consultarProducao(pool, dataProtheus) {
  const query = `
    SELECT 
      CAST(ISNULL(SUM(SD3.D3_QUANT * ISNULL(SB1.B1_PESO, 0)), 0) AS NUMERIC(12, 2)) AS total_producao
    FROM SD3${tabelaPrefixo} SD3
    LEFT JOIN SB1${tabelaPrefixo} SB1 
      ON SB1.B1_COD = SD3.D3_COD 
     AND SB1.D_E_L_E_T_ = ' '
    WHERE SD3.D3_TM = '010'
      AND SD3.D3_LOCAL = '98'
      AND SD3.D3_LOTECTL LIKE 'L%'
      AND SD3.D3_EMISSAO = @Data
      AND SD3.D_E_L_E_T_ = ' ';
  `;

  const request = pool.request();
  request.input("Data", sql.Char(8), dataProtheus);
  const result = await request.query(query);

  const total = result.recordset[0]?.total_producao ?? 0;
  return Number(Number(total).toFixed(2));
}

// ─── Sincronizar Registro no Supabase ─────────────────────────────────────────
async function sincronizarNoSupabase(registro) {
  if (isDryRun) {
    log(`[DRY-RUN] Registro para ${registro.data} (NÃO gravado):`, colors.yellow);
    console.dir(registro, { depth: null });
    return;
  }

  // Verifica se já existe um registro na mesma data
  const { data: existente, error: errSelect } = await supabase
    .from("registros")
    .select("id")
    .eq("data", registro.data)
    .maybeSingle();

  if (errSelect) {
    throw new Error(`Erro ao verificar registro existente: ${errSelect.message}`);
  }

  if (existente) {
    // Atualiza mantendo o id original
    const { error: errUpdate } = await supabase
      .from("registros")
      .update({
        producao: registro.producao,
        refugo: registro.refugo,
        motivos: registro.motivos,
        ano: registro.ano,
        mes: registro.mes,
      })
      .eq("id", existente.id);

    if (errUpdate) throw new Error(`Erro ao atualizar Supabase: ${errUpdate.message}`);
    log(`✓ Registro de ${registro.data} ATUALIZADO no Supabase (ID: ${existente.id})`, colors.green);
  } else {
    // Insere novo registro com ID determinístico
    const id = `protheus_${registro.data}`;
    const { error: errInsert } = await supabase
      .from("registros")
      .insert({
        id,
        data: registro.data,
        mes: registro.mes,
        ano: registro.ano,
        producao: registro.producao,
        refugo: registro.refugo,
        motivos: registro.motivos,
      });

    if (errInsert) throw new Error(`Erro ao inserir no Supabase: ${errInsert.message}`);
    log(`✓ Registro de ${registro.data} INSERIDO no Supabase (ID: ${id})`, colors.green);
  }
}

// ─── Salvar Status de Última Sincronização no Supabase (Badge Dashboard) ─────
async function salvarUltimaSincronizacao(resumo) {
  if (isDryRun || !supabase) return;

  try {
    const { error } = await supabase
      .from("config")
      .upsert({
        chave: "ultima_sincronizacao",
        valor: {
          timestamp: new Date().toISOString(),
          status: "sucesso",
          data_referencia: resumo.data,
          producao: resumo.producao,
          refugo: resumo.refugo,
          pct_refugo: resumo.pctRefugo,
          dias_processados: resumo.diasCount || 1,
        },
      }, { onConflict: "chave" });

    if (!error) {
      log("✓ Status de última sincronização gravado na tabela config (Supabase).", colors.dim);
    }
  } catch (err) {
    // Não falha a execução principal se o registro de status falhar
    log(`⚠ Não foi possível gravar status na tabela config: ${err.message}`, colors.dim);
  }
}

// ─── Ranking Top 10 Produtos & Ferramentas Mais Refugados (30 Dias) ──────────
async function processarRankingProdutos(pool) {
  log("Consultando ranking dos 10 produtos mais refugados (últimos 30 dias)...", colors.cyan);
  try {
    const query = `
      DECLARE @Inicio char(8);
      DECLARE @Fim char(8);

      SET @Inicio = CONVERT(char(8), DATEADD(day, -29, GETDATE()), 112);
      SET @Fim = CONVERT(char(8), GETDATE(), 112);

      DECLARE @Refugo TABLE (
          Produto varchar(15),
          Ferramenta varchar(6),
          NomeFerramenta varchar(25),
          KgRefugo float
      );

      DECLARE @Producao TABLE (
          Produto varchar(15),
          Descricao varchar(55),
          Unidade varchar(2),
          QuantidadeProduzida float,
          KgProducao float
      );

      ;WITH RefugoPorOP AS (
          SELECT
              BC.BC_FILIAL AS Filial,
              LTRIM(RTRIM(BC.BC_OP)) AS OP,
              LTRIM(RTRIM(BC.BC_FERRAME)) AS Ferramenta,
              LTRIM(RTRIM(BC.BC_NOMEFER)) AS NomeFerramenta,
              SUM(ISNULL(BC.BC_QTDDEST, 0)) AS KgRefugo
          FROM dbo.SBC${tabelaPrefixo} BC
          WHERE BC.D_E_L_E_T_ <> '*'
            AND BC.BC_FILIAL = '${empresa}'
            AND BC.BC_LOCAL = '55'
            AND NULLIF(LTRIM(RTRIM(BC.BC_OP)), '') IS NOT NULL
            AND BC.BC_DATA BETWEEN @Inicio AND @Fim
          GROUP BY
              BC.BC_FILIAL,
              LTRIM(RTRIM(BC.BC_OP)),
              LTRIM(RTRIM(BC.BC_FERRAME)),
              LTRIM(RTRIM(BC.BC_NOMEFER))
      )
      INSERT INTO @Refugo (Produto, Ferramenta, NomeFerramenta, KgRefugo)
      SELECT
          LTRIM(RTRIM(O.Produto)),
          R.Ferramenta,
          R.NomeFerramenta,
          R.KgRefugo
      FROM RefugoPorOP R
      OUTER APPLY (
          SELECT
              COUNT(*) AS Correspondencias,
              CASE WHEN COUNT(*) = 1 THEN MAX(C2.C2_PRODUTO) ELSE NULL END AS Produto,
              CASE WHEN COUNT(*) = 1 THEN MAX(C2.C2_LOTEIMP) ELSE NULL END AS Lote
          FROM dbo.SC2${tabelaPrefixo} C2
          WHERE C2.D_E_L_E_T_ <> '*'
            AND C2.C2_FILIAL = R.Filial
            AND (
                  LTRIM(RTRIM(C2.C2_OP)) = R.OP
                  OR (LTRIM(RTRIM(C2.C2_NUM)) + LTRIM(RTRIM(C2.C2_ITEM)) + LTRIM(RTRIM(C2.C2_SEQUEN))) = R.OP
                )
      ) O
      WHERE O.Correspondencias = 1
        AND LEFT(LTRIM(RTRIM(ISNULL(O.Lote, ''))), 1) <> 'R';

      INSERT INTO @Producao (Produto, Descricao, Unidade, QuantidadeProduzida, KgProducao)
      SELECT
          LTRIM(RTRIM(D3.D3_COD)),
          LTRIM(RTRIM(B1.B1_DESC)),
          LTRIM(RTRIM(B1.B1_UM)),
          SUM(ISNULL(D3.D3_QUANT, 0)),
          SUM(ISNULL(D3.D3_QUANT, 0) * ISNULL(B1.B1_PESO, 0))
      FROM dbo.SD3${tabelaPrefixo} D3
      OUTER APPLY (
          SELECT TOP (1) SB1.B1_DESC, SB1.B1_UM, SB1.B1_PESO, SB1.B1_TIPO
          FROM dbo.SB1${tabelaPrefixo} SB1
          WHERE SB1.D_E_L_E_T_ <> '*'
            AND SB1.B1_COD = D3.D3_COD
            AND SB1.B1_FILIAL IN ('', D3.D3_FILIAL)
          ORDER BY
              CASE WHEN SB1.B1_FILIAL = D3.D3_FILIAL THEN 0 ELSE 1 END,
              SB1.R_E_C_N_O_ DESC
      ) B1
      WHERE D3.D_E_L_E_T_ <> '*'
        AND D3.D3_FILIAL = '${empresa}'
        AND D3.D3_EMISSAO BETWEEN @Inicio AND @Fim
        AND D3.D3_TM = '010'
        AND D3.D3_LOCAL = '98'
        AND B1.B1_TIPO = '01'
        AND NULLIF(LTRIM(RTRIM(D3.D3_OP)), '') IS NOT NULL
        AND LEFT(LTRIM(RTRIM(ISNULL(D3.D3_LOTECTL, ''))), 1) <> 'R'
      GROUP BY
          LTRIM(RTRIM(D3.D3_COD)),
          LTRIM(RTRIM(B1.B1_DESC)),
          LTRIM(RTRIM(B1.B1_UM));

      ;WITH RefugoPorProduto AS (
          SELECT Produto, SUM(KgRefugo) AS KgRefugo
          FROM @Refugo
          GROUP BY Produto
      )
      SELECT TOP (10)
          CAST(
              STUFF(
                  (
                      SELECT DISTINCT
                          '; ' +
                          CASE
                              WHEN NULLIF(F.NomeFerramenta, '') IS NOT NULL THEN F.NomeFerramenta
                              WHEN NULLIF(F.Ferramenta, '') IS NOT NULL THEN F.Ferramenta
                              ELSE 'Sem ferramenta'
                          END
                      FROM @Refugo F
                      WHERE F.Produto = P.Produto
                      FOR XML PATH(''), TYPE
                  ).value('.', 'nvarchar(max)'),
                  1, 2, ''
              ) AS varchar(1000)
          ) AS Ferramentas,
          P.Produto,
          P.Descricao,
          CAST(P.QuantidadeProduzida AS decimal(18,3)) AS [Quantidade produzida],
          P.Unidade,
          CAST(P.KgProducao AS decimal(18,2)) AS [Produção kg],
          CAST(R.KgRefugo AS decimal(18,2)) AS [Refugo kg],
          CAST(R.KgRefugo * 100.0 / NULLIF(P.KgProducao + R.KgRefugo, 0) AS decimal(18,2)) AS [Rejeição %]
      FROM @Producao P
      INNER JOIN RefugoPorProduto R ON R.Produto = P.Produto
      WHERE P.KgProducao > 0 AND R.KgRefugo > 0
      ORDER BY
          R.KgRefugo * 100.0 / NULLIF(P.KgProducao + R.KgRefugo, 0) DESC,
          R.KgRefugo DESC,
          P.Produto;
    `;

    const result = await pool.request().query(query);
    const ranking = result.recordset.map((r) => ({
      ferramentas: r.Ferramentas ? r.Ferramentas.trim() : "Sem ferramenta",
      produto: r.Produto ? r.Produto.trim() : "",
      descricao: r.Descricao ? r.Descricao.trim() : "",
      quantidadeProduzida: parseFloat(r["Quantidade produzida"] || 0),
      unidade: r.Unidade ? r.Unidade.trim() : "",
      kgProducao: parseFloat(r["Produção kg"] || 0),
      kgRefugo: parseFloat(r["Refugo kg"] || 0),
      rejeicaoPct: parseFloat(r["Rejeição %"] || 0),
    }));

    log(`✓ Encontrados ${ranking.length} produtos no Top 10 de refugo.`, colors.green);

    if (!isDryRun && supabase) {
      const { error } = await supabase
        .from("config")
        .upsert({
          chave: "ranking_produtos_refugo",
          valor: {
            atualizado_em: new Date().toISOString(),
            dias_janela: 30,
            produtos: ranking,
          },
        }, { onConflict: "chave" });

      if (error) {
        log(`⚠ Falha ao salvar ranking de produtos no Supabase: ${error.message}`, colors.yellow);
      } else {
        log("✓ Ranking dos 10 produtos mais refugados gravado na tabela config (Supabase).", colors.green);
      }
    }

    return ranking;
  } catch (err) {
    log(`⚠ Erro ao consultar ranking de produtos: ${err.message}`, colors.yellow);
    return [];
  }
}

// ─── Processar uma Única Data ────────────────────────────────────────────────
async function processarDia(pool, dataIso) {
  const dataProtheus = dataIso.replace(/-/g, ""); // 'YYYYMMDD'
  const [anoStr, mesStr] = dataIso.split("-");
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);

  log(`--------------------------------------------------`, colors.dim);
  log(`Processando data: ${dataIso} (Protheus: ${dataProtheus})`, colors.cyan);

  const { motivos, totalRefugo } = await consultarRefugo(pool, dataProtheus);
  const totalProducao = await consultarProducao(pool, dataProtheus);

  const pctRefugo = totalProducao > 0 
    ? ((totalRefugo / (totalProducao + totalRefugo)) * 100).toFixed(1)
    : "0.0";

  log(`Produção : ${totalProducao.toLocaleString("pt-BR")} Kg`, colors.bright);
  log(`Refugo   : ${totalRefugo.toLocaleString("pt-BR")} Kg (${pctRefugo}%)`, colors.bright);
  log(`Motivos  : ${motivos.length} categoria(s) encontrada(s)`, colors.bright);

  motivos.forEach((m) => {
    log(`  • ${m.motivo}: ${m.quantidade.toLocaleString("pt-BR")} Kg`, colors.dim);
  });

  const payload = {
    data: dataIso,
    ano,
    mes,
    producao: totalProducao,
    refugo: totalRefugo,
    motivos,
  };

  await sincronizarNoSupabase(payload);

  return {
    data: dataIso,
    producao: totalProducao,
    refugo: totalRefugo,
    pctRefugo,
    motivos,
  };
}

// ─── Processar Todo um Mês ───────────────────────────────────────────────────
async function processarMes(pool, mes, ano) {
  const mesPad = String(mes).padStart(2, "0");
  const prefixoProtheus = `${ano}${mesPad}`;

  log(`Buscando todas as datas com movimento no mês ${mesPad}/${ano}...`, colors.cyan);

  const queryDias = `
    SELECT DISTINCT DATA FROM (
      SELECT BC_DATA AS DATA FROM SBC${tabelaPrefixo} 
      WHERE BC_LOCAL = '55' AND BC_DATA LIKE '${prefixoProtheus}%' AND D_E_L_E_T_ = ' '
      UNION
      SELECT D3_EMISSAO AS DATA FROM SD3${tabelaPrefixo}
      WHERE D3_TM = '010' AND D3_LOCAL = '98' AND D3_EMISSAO LIKE '${prefixoProtheus}%' AND D_E_L_E_T_ = ' '
    ) T
    ORDER BY DATA ASC;
  `;

  const result = await pool.request().query(queryDias);
  const dias = result.recordset.map((r) => r.DATA.trim());

  if (dias.length === 0) {
    log(`Nenhum movimento encontrado para ${mesPad}/${ano}.`, colors.yellow);
    return null;
  }

  log(`Encontrados ${dias.length} dia(s) com movimento. Iniciando sincronização...`, colors.green);

  let ultimoResumo = null;
  for (const d of dias) {
    const dataIso = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
    ultimoResumo = await processarDia(pool, dataIso);
  }

  if (ultimoResumo) {
    ultimoResumo.diasCount = dias.length;
  }
  return ultimoResumo;
}

// ─── Fluxo Principal ─────────────────────────────────────────────────────────
async function main() {
  if (isTestConn) {
    await testConnection();
    return;
  }

  if (isTestEmail) {
    await testEmail();
    return;
  }

  log(`==================================================`, colors.magenta);
  log(`IMPLATEC: Sincronizador Protheus -> Dashboard`, colors.magenta + colors.bright);
  log(`==================================================`, colors.magenta);

  if (isDryRun) {
    log(`MODO DRY-RUN: Nenhuma alteração será gravada no Supabase.`, colors.yellow);
  }

  log(`Conectando ao SQL Server (${dbConfig.server}:${dbConfig.port} / ${dbConfig.database})...`, colors.dim);
  const pool = await sql.connect(dbConfig);
  log(`✓ Conectado ao SQL Server Protheus.`, colors.green);

  let resumoFinal = null;

  try {
    if (argMes && argAno) {
      resumoFinal = await processarMes(pool, parseInt(argMes, 10), parseInt(argAno, 10));
    } else {
      if (argData) {
        resumoFinal = await processarDia(pool, argData);
      } else {
        const hoje = new Date();
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);

        const formatarDataIso = (d) => {
          const ano = d.getFullYear();
          const mes = String(d.getMonth() + 1).padStart(2, "0");
          const dia = String(d.getDate()).padStart(2, "0");
          return `${ano}-${mes}-${dia}`;
        };

        const dataOntem = formatarDataIso(ontem);
        const dataHoje = formatarDataIso(hoje);

        log(`Sincronizando dia anterior (${dataOntem}) para consolidar turno da noite...`, colors.dim);
        await processarDia(pool, dataOntem);

        log(`Sincronizando dia atual (${dataHoje})...`, colors.dim);
        resumoFinal = await processarDia(pool, dataHoje);
        if (resumoFinal) {
          resumoFinal.diasCount = 2;
        }
      }
    }

    if (resumoFinal) {
      await salvarUltimaSincronizacao(resumoFinal);
      const rankingProdutos = await processarRankingProdutos(pool);
      resumoFinal.rankingProdutos = rankingProdutos;
      await enviarEmailRelatorio(resumoFinal);
    }

    log(`==================================================`, colors.green);
    log(`✓ Sincronização concluída com sucesso!`, colors.green + colors.bright);
    log(`==================================================`, colors.green);
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  log(`✗ ERRO FATAL: ${err.message}`, colors.red);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
