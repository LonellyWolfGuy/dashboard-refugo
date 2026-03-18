import express, { type Request, type Response, type NextFunction } from "express";
import { nanoid } from "nanoid";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { entries, metas, users, insertEntrySchema, updateEntrySchema } from "@shared/schema";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "implatec-refugo-secret-2026-change-in-production";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Express app
// =============================================================================

const app = express();
app.use(express.json());

// CORS — allows Vite dev server (dev) and same-origin (prod)
app.use((_req: Request, res: Response, next: NextFunction) => {
  const allowed =
    process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL ?? "*"
      : "*";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.options("*", (_req, res) => res.sendStatus(204));

// =============================================================================
// Helpers
// =============================================================================

function computePerda(producao: number, refugo: number): string {
  return producao > 0 ? ((refugo / producao) * 100).toFixed(2) : "0.00";
}

function computeStatus(perda: number, metaPerda: number): "ok" | "alerta" | "critico" {
  if (perda <= metaPerda) return "ok";
  if (perda <= metaPerda * 1.5) return "alerta";
  return "critico";
}

function formatMonthLabel(ym: string): string {
  const names = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const [year, month] = ym.split("-");
  return `${names[+month - 1] ?? month}/${year}`;
}

// =============================================================================
// Health
// =============================================================================

app.get("/api/health", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ ok: true, db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false, db: "disconnected" });
  }
});

// =============================================================================
// AUTH MIDDLEWARE
// =============================================================================

interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

// =============================================================================
// AUTH ROUTES — /api/auth
// =============================================================================

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username: string; password: string };
    if (!username || !password) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    }

    const [user] = await db.select().from(users).where(eq(users.username, username.trim().toLowerCase()));

    if (!user || !user.ativo) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    const senhaValida = await bcrypt.compare(password, user.passwordHash);
    if (!senhaValida) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, nome: user.nome, role: user.role },
    });
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId));
    if (!user || !user.ativo) return res.status(401).json({ error: "Não autenticado" });
    res.json({ id: user.id, username: user.username, nome: user.nome, role: user.role });
  } catch (err) {
    console.error("[GET /api/auth/me]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/api/auth/logout", (_req, res) => {
  res.json({ ok: true });
});

// =============================================================================
// USERS — /api/users  (somente admin)
// =============================================================================

app.get("/api/users", requireAuth, async (req: Request, res: Response) => {
  if (req.user!.role !== "admin") return res.status(403).json({ error: "Sem permissão" });
  try {
    const rows = await db
      .select({ id: users.id, username: users.username, nome: users.nome, role: users.role, ativo: users.ativo, createdAt: users.createdAt })
      .from(users)
      .orderBy(users.nome);
    res.json(rows);
  } catch (err) {
    console.error("[GET /api/users]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/api/users", requireAuth, async (req: Request, res: Response) => {
  if (req.user!.role !== "admin") return res.status(403).json({ error: "Sem permissão" });
  try {
    const { username, password, nome, role } = req.body as { username: string; password: string; nome: string; role: string };
    if (!username || !password || !nome) return res.status(400).json({ error: "username, password e nome são obrigatórios" });

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({
      id: nanoid(),
      username: username.trim().toLowerCase(),
      passwordHash,
      nome,
      role: role === "admin" ? "admin" : "viewer",
    }).returning({ id: users.id, username: users.username, nome: users.nome, role: users.role, ativo: users.ativo });

    res.status(201).json(user);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Nome de usuário já existe" });
    console.error("[POST /api/users]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.patch("/api/users/:id", requireAuth, async (req: Request, res: Response) => {
  if (req.user!.role !== "admin") return res.status(403).json({ error: "Sem permissão" });
  try {
    const { password, nome, role, ativo } = req.body as { password?: string; nome?: string; role?: string; ativo?: boolean };
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (nome) updates.nome = nome;
    if (role) updates.role = role === "admin" ? "admin" : "viewer";
    if (ativo !== undefined) updates.ativo = ativo;
    if (password) updates.passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db.update(users).set(updates).where(eq(users.id, req.params.id))
      .returning({ id: users.id, username: users.username, nome: users.nome, role: users.role, ativo: users.ativo });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(user);
  } catch (err) {
    console.error("[PATCH /api/users/:id]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.delete("/api/users/:id", requireAuth, async (req: Request, res: Response) => {
  if (req.user!.role !== "admin") return res.status(403).json({ error: "Sem permissão" });
  if (req.params.id === req.user!.userId) return res.status(400).json({ error: "Não é possível excluir o próprio usuário" });
  try {
    const result = await db.delete(users).where(eq(users.id, req.params.id)).returning();
    if (!result.length) return res.status(404).json({ error: "Usuário não encontrado" });
    res.status(204).send();
  } catch (err) {
    console.error("[DELETE /api/users/:id]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// =============================================================================
// PROTECT ALL /api routes below with requireAuth
// =============================================================================

app.use("/api/entries", requireAuth);
app.use("/api/summaries", requireAuth);
app.use("/api/metas", requireAuth);
app.use("/api/analytics", requireAuth);

// GET /api/entries?month=2026-03
app.get("/api/entries", async (req: Request, res: Response) => {
  try {
    const { month, date } = req.query as Record<string, string>;

    const conditions = [];
    if (month) conditions.push(eq(entries.month, month));
    if (date) conditions.push(eq(entries.date, date));

    const rows = await db
      .select()
      .from(entries)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(entries.date);

    res.json(rows);
  } catch (err) {
    console.error("[GET /api/entries]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/entries/:id
app.get("/api/entries/:id", async (req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(entries).where(eq(entries.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Entrada não encontrada" });
    res.json(row);
  } catch (err) {
    console.error("[GET /api/entries/:id]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/entries
app.post("/api/entries", async (req: Request, res: Response) => {
  try {
    const parsed = insertEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }

    const { date, producao, refugo, turno, descricao } = parsed.data;
    const numProducao = Number(producao);
    const numRefugo = Number(refugo);

    if (numRefugo > numProducao) {
      return res.status(400).json({ error: "Refugo não pode exceder produção" });
    }

    const id = nanoid();
    const month = date.slice(0, 7);
    const perda = computePerda(numProducao, numRefugo);
    const now = new Date();

    const [row] = await db
      .insert(entries)
      .values({
        id,
        date,
        month,
        producao: String(producao),
        refugo: String(refugo),
        perda,
        turno: turno ?? "GERAL",
        descricao,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    console.error("[POST /api/entries]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PUT /api/entries/:id
app.put("/api/entries/:id", async (req: Request, res: Response) => {
  try {
    const [existing] = await db.select().from(entries).where(eq(entries.id, req.params.id));
    if (!existing) return res.status(404).json({ error: "Entrada não encontrada" });

    const parsed = insertEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }

    const { date, producao, refugo, turno, descricao } = parsed.data;
    const numProducao = Number(producao);
    const numRefugo = Number(refugo);

    if (numRefugo > numProducao) {
      return res.status(400).json({ error: "Refugo não pode exceder produção" });
    }

    const month = date.slice(0, 7);
    const perda = computePerda(numProducao, numRefugo);

    const [row] = await db
      .update(entries)
      .set({ date, month, producao: String(producao), refugo: String(refugo), perda, turno, descricao, updatedAt: new Date() })
      .where(eq(entries.id, req.params.id))
      .returning();

    res.json(row);
  } catch (err) {
    console.error("[PUT /api/entries/:id]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PATCH /api/entries/:id
app.patch("/api/entries/:id", async (req: Request, res: Response) => {
  try {
    const [existing] = await db.select().from(entries).where(eq(entries.id, req.params.id));
    if (!existing) return res.status(404).json({ error: "Entrada não encontrada" });

    const parsed = updateEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const producao = Number(data.producao ?? existing.producao);
    const refugo = Number(data.refugo ?? existing.refugo);

    if (refugo > producao) {
      return res.status(400).json({ error: "Refugo não pode exceder produção" });
    }

    const date = data.date ?? existing.date;
    const month = date.slice(0, 7);
    const perda = computePerda(producao, refugo);

    const [row] = await db
      .update(entries)
      .set({
        date,
        month,
        producao: String(producao),
        refugo: String(refugo),
        perda,
        turno: data.turno ?? existing.turno,
        descricao: data.descricao ?? existing.descricao,
        updatedAt: new Date(),
      })
      .where(eq(entries.id, req.params.id))
      .returning();

    res.json(row);
  } catch (err) {
    console.error("[PATCH /api/entries/:id]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/entries/:id
app.delete("/api/entries/:id", async (req: Request, res: Response) => {
  try {
    const result = await db.delete(entries).where(eq(entries.id, req.params.id)).returning();
    if (!result.length) return res.status(404).json({ error: "Entrada não encontrada" });
    res.status(204).send();
  } catch (err) {
    console.error("[DELETE /api/entries/:id]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// =============================================================================
// SUMMARIES — /api/summaries
// =============================================================================

async function buildSummary(month: string) {
  const rows = await db.select().from(entries).where(eq(entries.month, month));
  const meta = await db.select().from(metas).where(eq(metas.month, month));
  const metaPerda = Number(meta[0]?.metaPerda ?? 2.0);

  const totalProducao = rows.reduce((s, e) => s + Number(e.producao), 0);
  const totalRefugo = rows.reduce((s, e) => s + Number(e.refugo), 0);
  const mediaPerda = totalProducao > 0 ? (totalRefugo / totalProducao) * 100 : 0;

  return {
    month,
    totalProducao,
    totalRefugo,
    mediaPerda: +mediaPerda.toFixed(2),
    metaPerda,
    diasRegistrados: rows.length,
    status: computeStatus(mediaPerda, metaPerda),
  };
}

// GET /api/summaries?months=2026-01,2026-02
app.get("/api/summaries", async (req: Request, res: Response) => {
  try {
    const raw = (req.query.months as string) ?? "";
    let months: string[];

    if (raw) {
      months = raw.split(",").map((m) => m.trim()).filter(Boolean);
    } else {
      const rows = await db
        .selectDistinct({ month: entries.month })
        .from(entries)
        .orderBy(entries.month);
      months = rows.map((r) => r.month);
    }

    const summaries = await Promise.all(months.map(buildSummary));
    res.json(summaries);
  } catch (err) {
    console.error("[GET /api/summaries]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/summaries/:month
app.get("/api/summaries/:month", async (req: Request, res: Response) => {
  try {
    const { month } = req.params;
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "month deve ser YYYY-MM" });
    }
    res.json(await buildSummary(month));
  } catch (err) {
    console.error("[GET /api/summaries/:month]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// =============================================================================
// METAS — /api/metas
// =============================================================================

app.get("/api/metas", async (_req, res) => {
  try {
    const rows = await db.select().from(metas).orderBy(metas.month);
    res.json(rows);
  } catch (err) {
    console.error("[GET /api/metas]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.get("/api/metas/:month", async (req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(metas).where(eq(metas.month, req.params.month));
    res.json(row ?? { month: req.params.month, metaPerda: "2.00" });
  } catch (err) {
    console.error("[GET /api/metas/:month]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.put("/api/metas/:month", async (req: Request, res: Response) => {
  try {
    const { month } = req.params;
    const { metaPerda } = req.body as { metaPerda: number };

    if (metaPerda == null || Number(metaPerda) < 0 || Number(metaPerda) > 100) {
      return res.status(400).json({ error: "metaPerda deve estar entre 0 e 100" });
    }

    const [row] = await db
      .insert(metas)
      .values({ month, metaPerda: String(metaPerda) })
      .onConflictDoUpdate({ target: metas.month, set: { metaPerda: String(metaPerda) } })
      .returning();

    res.json(row);
  } catch (err) {
    console.error("[PUT /api/metas/:month]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// =============================================================================
// ANALYTICS — /api/analytics
// =============================================================================

app.get("/api/analytics/trend", async (req: Request, res: Response) => {
  try {
    const raw = (req.query.months as string) ?? "";
    let months: string[];

    if (raw) {
      months = raw.split(",").map((m) => m.trim()).filter(Boolean);
    } else {
      const rows = await db.selectDistinct({ month: entries.month }).from(entries).orderBy(entries.month);
      months = rows.map((r) => r.month);
    }

    const series = await Promise.all(
      months.map(async (m) => {
        const s = await buildSummary(m);
        return { ...s, label: formatMonthLabel(m) };
      })
    );

    res.json(series);
  } catch (err) {
    console.error("[GET /api/analytics/trend]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.get("/api/analytics/daily", async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) ?? "";
    if (!month) return res.status(400).json({ error: "month é obrigatório" });

    const [metaRow] = await db.select().from(metas).where(eq(metas.month, month));
    const metaPerda = Number(metaRow?.metaPerda ?? 2.0);

    const rows = await db
      .select()
      .from(entries)
      .where(eq(entries.month, month))
      .orderBy(entries.date);

    res.json({
      month,
      meta: metaPerda,
      entries: rows.map((e) => ({
        id: e.id,
        date: e.date,
        day: +e.date.slice(8),
        producao: Number(e.producao),
        refugo: Number(e.refugo),
        perda: Number(e.perda),
        turno: e.turno,
        descricao: e.descricao,
        status: computeStatus(Number(e.perda), metaPerda),
      })),
    });
  } catch (err) {
    console.error("[GET /api/analytics/daily]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// =============================================================================
// Serve frontend in production
// =============================================================================

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "../public");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// =============================================================================
// Error handler & 404
// =============================================================================

app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada" }));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[unhandled error]", err);
  res.status(500).json({ error: "Erro interno", message: err.message });
});

// =============================================================================
// Start
// =============================================================================

const PORT = Number(process.env.PORT ?? 3001);

app.listen(PORT, () => {
  console.log(`\n🏭  Dashboard de Refugo — API`);
  console.log(`    http://localhost:${PORT}`);
  console.log(`    Env: ${process.env.NODE_ENV ?? "development"}`);
  console.log(`    DB : ${process.env.DATABASE_URL ? "✅ conectado" : "❌ DATABASE_URL ausente"}\n`);
});

export default app;
