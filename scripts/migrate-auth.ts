/**
 * migrate-auth.ts
 * Cria a tabela `users` no banco de dados PostgreSQL.
 * Execute: pnpm db:migrate
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL não definida no .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("🔄  Executando migração de autenticação...\n");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        username      TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        nome          TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'viewer',
        ativo         BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log("✅  Tabela 'users' criada (ou já existia).");
    console.log('\n👉  Agora execute:  pnpm create-admin\n');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("❌  Erro na migração:", err);
  process.exit(1);
});
