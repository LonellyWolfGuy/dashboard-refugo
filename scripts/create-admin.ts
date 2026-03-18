/**
 * create-admin.ts
 * Cria (ou atualiza) o usuário administrador no banco.
 * Execute: pnpm create-admin
 *
 * Você pode personalizar as variáveis abaixo antes de executar.
 */

import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import * as dotenv from "dotenv";
dotenv.config();

// ─── PERSONALIZE AQUI ────────────────────────────────────────────────────────
const ADMIN_USERNAME = "admin";
const ADMIN_SENHA    = "Implatec@2026";   // Altere para a senha desejada
const ADMIN_NOME     = "Administrador";
// ─────────────────────────────────────────────────────────────────────────────

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL não definida no .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function createAdmin() {
  const client = await pool.connect();
  try {
    console.log("🔐  Criando usuário administrador...\n");

    const passwordHash = await bcrypt.hash(ADMIN_SENHA, 12);
    const id = nanoid();

    const { rows } = await client.query(
      `SELECT id FROM users WHERE username = $1`,
      [ADMIN_USERNAME]
    );

    if (rows.length > 0) {
      // Atualiza senha se usuário já existe
      await client.query(
        `UPDATE users SET password_hash = $1, nome = $2, role = 'admin', ativo = TRUE, updated_at = NOW()
         WHERE username = $3`,
        [passwordHash, ADMIN_NOME, ADMIN_USERNAME]
      );
      console.log(`✅  Usuário '${ADMIN_USERNAME}' atualizado com sucesso.`);
    } else {
      await client.query(
        `INSERT INTO users (id, username, password_hash, nome, role, ativo, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'admin', TRUE, NOW(), NOW())`,
        [id, ADMIN_USERNAME, passwordHash, ADMIN_NOME]
      );
      console.log(`✅  Usuário '${ADMIN_USERNAME}' criado com sucesso.`);
    }

    console.log(`\n   Login   : ${ADMIN_USERNAME}`);
    console.log(`   Senha   : ${ADMIN_SENHA}`);
    console.log(`   Perfil  : admin\n`);
    console.log("🚀  Agora inicie o servidor: pnpm dev\n");
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin().catch((err) => {
  console.error("❌  Erro ao criar admin:", err);
  process.exit(1);
});
