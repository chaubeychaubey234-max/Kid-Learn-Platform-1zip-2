import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users (Kids and Parents)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["parent", "kid"] }).notNull().default("kid"),
  avatar: text("avatar"), // URL or icon identifier
  pin: text("pin"), // 4-digit PIN for parent access
});

// Parental Control Settings
export const parentalSettings = pgTable("parental_settings", {
  id: serial("id").primaryKey(),
  kidId: integer("kid_id").notNull(), // Ideally FK to users.id
  dailyTimeLimitMinutes: integer("daily_time_limit_minutes").default(60),
  allowStories: boolean("allow_stories").default(true),
  allowLearning: boolean("allow_learning").default(true),
  allowCreativity: boolean("allow_creativity").default(true),
  allowMessaging: boolean("allow_messaging").default(true),
});

// Educational/Fun Content
export const content = pgTable("content", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: ["story", "learning", "creativity"] }).notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  videoUrl: text("video_url"),
  likes: integer("likes").default(0),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertSettingsSchema = createInsertSchema(parentalSettings).omit({ id: true });
export const insertContentSchema = createInsertSchema(content).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ParentalSettings = typeof parentalSettings.$inferSelect;
export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
