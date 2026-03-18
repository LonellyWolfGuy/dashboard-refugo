/**
 * Seed script — populates the database with sample data for 2026.
 * Run once after migrations: npx tsx server/seed.ts
 */
import { nanoid } from "nanoid";
import { db } from "./db";
import { entries, metas } from "@shared/schema";
import { sql } from "drizzle-orm";

type Turno = "A" | "B" | "C" | "GERAL";

const seedData: Array<[string, number, number, Turno, string]> = [
  // Janeiro 2026
  ["2026-01-02", 1240, 18, "GERAL", "Início de semana"],
  ["2026-01-05", 1380, 32, "GERAL", "Segunda-feira"],
  ["2026-01-06", 1290, 14, "GERAL", ""],
  ["2026-01-07", 1410, 41, "GERAL", "Troca de ferramenta"],
  ["2026-01-08", 1350, 22, "GERAL", ""],
  ["2026-01-09", 1270, 19, "GERAL", ""],
  ["2026-01-12", 1460, 28, "GERAL", ""],
  ["2026-01-13", 1500, 45, "GERAL", "Falha no sensor linha 3"],
  ["2026-01-14", 1380, 17, "GERAL", ""],
  ["2026-01-15", 1420, 24, "GERAL", ""],
  ["2026-01-16", 1310, 16, "GERAL", ""],
  ["2026-01-19", 1490, 38, "GERAL", ""],
  ["2026-01-20", 1440, 21, "GERAL", ""],
  ["2026-01-21", 1360, 12, "GERAL", ""],
  ["2026-01-22", 1480, 29, "GERAL", ""],
  ["2026-01-23", 1400, 18, "GERAL", ""],
  ["2026-01-26", 1520, 52, "GERAL", "Ajuste de molde"],
  ["2026-01-27", 1390, 23, "GERAL", ""],
  ["2026-01-28", 1340, 15, "GERAL", ""],
  ["2026-01-29", 1410, 27, "GERAL", ""],
  ["2026-01-30", 1370, 20, "GERAL", ""],
  // Fevereiro 2026
  ["2026-02-02", 1350, 24, "GERAL", ""],
  ["2026-02-03", 1420, 35, "GERAL", ""],
  ["2026-02-04", 1390, 19, "GERAL", ""],
  ["2026-02-05", 1480, 47, "GERAL", "Manutenção preventiva"],
  ["2026-02-06", 1310, 13, "GERAL", ""],
  ["2026-02-09", 1460, 31, "GERAL", ""],
  ["2026-02-10", 1500, 28, "GERAL", ""],
  ["2026-02-11", 1370, 16, "GERAL", ""],
  ["2026-02-12", 1440, 22, "GERAL", ""],
  ["2026-02-16", 1390, 18, "GERAL", ""],
  ["2026-02-17", 1520, 55, "GERAL", "Desgaste ferramenta 07"],
  ["2026-02-18", 1400, 26, "GERAL", ""],
  ["2026-02-19", 1360, 14, "GERAL", ""],
  ["2026-02-20", 1430, 21, "GERAL", ""],
  ["2026-02-23", 1480, 33, "GERAL", ""],
  ["2026-02-24", 1350, 12, "GERAL", ""],
  ["2026-02-25", 1410, 25, "GERAL", ""],
  ["2026-02-26", 1490, 43, "GERAL", ""],
  ["2026-02-27", 1420, 19, "GERAL", ""],
  // Março 2026
  ["2026-03-02", 1450, 22, "GERAL", ""],
  ["2026-03-03", 1380, 28, "GERAL", ""],
  ["2026-03-04", 1500, 37, "GERAL", ""],
  ["2026-03-05", 1420, 15, "GERAL", ""],
  ["2026-03-06", 1390, 19, "GERAL", ""],
  ["2026-03-09", 1470, 44, "GERAL", "Ajuste linha 2"],
  ["2026-03-10", 1510, 31, "GERAL", ""],
  ["2026-03-11", 1430, 17, "GERAL", "Hoje"],
];

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  // Metas padrão
  const metaMonths = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
  await db
    .insert(metas)
    .values(metaMonths.map((month) => ({ month, metaPerda: "2.00" })))
    .onConflictDoNothing();
  console.log(`✅ ${metaMonths.length} metas inseridas`);

  // Entradas diárias
  const rows = seedData.map(([date, producao, refugo, turno, descricao]) => {
    const month = date.slice(0, 7);
    const perda = producao > 0 ? ((refugo / producao) * 100).toFixed(2) : "0.00";
    return {
      id: nanoid(),
      date,
      month,
      producao: String(producao),
      refugo: String(refugo),
      perda,
      turno,
      descricao: descricao || null,
    };
  });

  await db.insert(entries).values(rows).onConflictDoNothing();
  console.log(`✅ ${rows.length} entradas inseridas`);

  console.log("\n🎉 Seed concluído com sucesso!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
