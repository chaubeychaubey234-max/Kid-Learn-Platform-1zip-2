import { db } from "./db";
import {
  users, parentalSettings, content,
  type User, type InsertUser,
  type ParentalSettings,
  type Content, type InsertContent
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Settings
  getSettings(kidId: number): Promise<ParentalSettings | undefined>;
  updateSettings(kidId: number, settings: Partial<ParentalSettings>): Promise<ParentalSettings>;

  // Content
  getContent(): Promise<Content[]>;
  createContent(item: InsertContent): Promise<Content>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getSettings(kidId: number): Promise<ParentalSettings | undefined> {
    const [settings] = await db.select().from(parentalSettings).where(eq(parentalSettings.kidId, kidId));
    return settings;
  }

  async updateSettings(kidId: number, settings: Partial<ParentalSettings>): Promise<ParentalSettings> {
    const existing = await this.getSettings(kidId);
    if (!existing) {
      const [newSettings] = await db.insert(parentalSettings).values({ ...settings, kidId }).returning();
      return newSettings;
    }
    const [updated] = await db.update(parentalSettings)
      .set(settings)
      .where(eq(parentalSettings.kidId, kidId))
      .returning();
    return updated;
  }

  async getContent(): Promise<Content[]> {
    return await db.select().from(content);
  }

  async createContent(item: InsertContent): Promise<Content> {
    const [newItem] = await db.insert(content).values(item).returning();
    return newItem;
  }
}

export const storage = new DatabaseStorage();
