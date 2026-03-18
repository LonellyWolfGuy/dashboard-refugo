import { pgTable, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// Enums
// =============================================================================

export const turnoEnum = pgEnum("turno", ["A", "B", "C", "GERAL"]);
export const statusEnum = pgEnum("status_refugo", ["ok", "alerta", "critico"]);

// =============================================================================
// Tables
// =============================================================================

export const entries = pgTable("entries", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),           // "YYYY-MM-DD"
  month: text("month").notNull(),         // "YYYY-MM"
  producao: numeric("producao", { precision: 10, scale: 2 }).notNull(),
  refugo: numeric("refugo", { precision: 10, scale: 2 }).notNull(),
  perda: numeric("perda", { precision: 6, scale: 2 }).notNull(), // %
  turno: turnoEnum("turno").default("GERAL"),
  descricao: text("descricao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const metas = pgTable("metas", {
  month: text("month").primaryKey(),      // "YYYY-MM"
  metaPerda: numeric("meta_perda", { precision: 6, scale: 2 }).notNull().default("2.00"),
});

// =============================================================================
// Zod schemas
// =============================================================================

export const insertEntrySchema = createInsertSchema(entries, {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD"),
  producao: z.coerce.number().min(0),
  refugo: z.coerce.number().min(0),
}).omit({ id: true, month: true, perda: true, createdAt: true, updatedAt: true });

export const updateEntrySchema = insertEntrySchema.partial();

export const insertMetaSchema = createInsertSchema(metas, {
  metaPerda: z.coerce.number().min(0).max(100),
});

export const selectEntrySchema = createSelectSchema(entries);
export const selectMetaSchema = createSelectSchema(metas);

// =============================================================================
// Types
// =============================================================================

export type Entry = typeof entries.$inferSelect;
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Meta = typeof metas.$inferSelect;
export type InsertMeta = z.infer<typeof insertMetaSchema>;
