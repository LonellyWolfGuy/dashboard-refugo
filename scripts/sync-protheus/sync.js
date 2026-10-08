#!/usr/bin/env node
/**
 * ==============================================================================
 * IMPLATEC - SINCRONIZADOR PROTHEUS (SQL SERVER) -> SUPABASE (DASHBOARD REFUGO)
 * ==============================================================================
 * Consulta dados diários de produção e refugo diretamente no banco do Protheus
 * e sincroniza de forma idempotente com a tabela 'registros' no Supabase.
 *
 * Uso:
 *   node sync.js                     -> Sincroniza o dia de hoje
 *   node sync.js --data 2026-10-07   -> Sincroniza uma data específica
 *   node sync.js --mes 10 --ano 2026 -> Sincroniza todos os dias com movimento no mês
 *   node sync.js --dry-run           -> Apenas consulta e exibe sem gravar no Supabase
 *   node sync.js --test-conn         -> Testa a conexão com o SQL Server
 * ==============================================================================
 */

import sql from "mssql";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env do mesmo diretório
import fs from "fs";
const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  console.warn("\x1b[33m[AVISO] Arquivo .env não encontrado em " + envPath + "\x1b[0m");
  console.warn("\x1b[33mCopie o arquivo .env.example para .env e preencha com as credenciais do SQL Server e Supabase.\x1b[0m\n");
}
dotenv.config({ path: envPath });

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
  console.log(`${colors.dim}[${time}]${colors.reset} ${color}${msg}${colors.reset}`);
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

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const argData = getArgValue("--data"); // 'YYYY-MM-DD'
const argMes = getArgValue("--mes");   // '1-12'
const argAno = getArgValue("--ano");   // '2026'

// ─── Conexão com Supabase ────────────────────────────────────────────────────
let supabase = null;
if (!isDryRun && !isTestConn) {
  if (!supabaseUrl || !supabaseKey) {
    log("ERRO: Credenciais do Supabase não encontradas no arquivo .env!", colors.red);
    process.exit(1);
  }
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Função de Teste de Conexão ──────────────────────────────────────────────
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

// ─── Processar uma Única Data ────────────────────────────────────────────────
async function processarDia(pool, dataIso) {
  // dataIso formato 'YYYY-MM-DD'
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
}

// ─── Processar Todo um Mês ───────────────────────────────────────────────────
async function processarMes(pool, mes, ano) {
  const mesPad = String(mes).padStart(2, "0");
  const prefixoProtheus = `${ano}${mesPad}`;

  log(`Buscando todas as datas com movimento no mês ${mesPad}/${ano}...`, colors.cyan);

  // Busca todos os dias que tiveram apontamento em SBC ou SD3
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
    return;
  }

  log(`Encontrados ${dias.length} dia(s) com movimento. Iniciando sincronização...`, colors.green);

  for (const d of dias) {
    const dataIso = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
    await processarDia(pool, dataIso);
  }
}

// ─── Fluxo Principal ─────────────────────────────────────────────────────────
async function main() {
  if (isTestConn) {
    await testConnection();
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

  try {
    if (argMes && argAno) {
      await processarMes(pool, parseInt(argMes, 10), parseInt(argAno, 10));
    } else {
      if (argData) {
        await processarDia(pool, argData);
      } else {
        // Rotina padrão diária: processa ontem (D-1) e hoje (D-0)
        // Isso garante que apontamentos noturnos ou do fim do dia sejam sempre atualizados às 07:00 e 18:00
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
        await processarDia(pool, dataHoje);
      }
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
