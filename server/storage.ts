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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private settings: Map<number, ParentalSettings>;
  private content: Content[];
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.settings = new Map();
    this.content = [];
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, avatar: insertUser.avatar || null };
    this.users.set(id, user);
    return user;
  }

  async getSettings(kidId: number): Promise<ParentalSettings | undefined> {
    return this.settings.get(kidId);
  }

  async updateSettings(kidId: number, updates: Partial<ParentalSettings>): Promise<ParentalSettings> {
    const existing = this.settings.get(kidId);
    if (!existing) {
      const newSettings: ParentalSettings = {
        id: this.currentId++,
        kidId,
        dailyTimeLimitMinutes: updates.dailyTimeLimitMinutes ?? 60,
        allowStories: updates.allowStories ?? true,
        allowLearning: updates.allowLearning ?? true,
        allowCreativity: updates.allowCreativity ?? true,
        allowMessaging: updates.allowMessaging ?? true,
      };
      this.settings.set(kidId, newSettings);
      return newSettings;
    }
    const updated = { ...existing, ...updates };
    this.settings.set(kidId, updated);
    return updated;
  }

  async getContent(): Promise<Content[]> {
    return this.content;
  }

  async createContent(item: InsertContent): Promise<Content> {
    const id = this.currentId++;
    const newContent: Content = { ...item, id };
    this.content.push(newContent);
    return newContent;
  }
}

export const storage = new MemStorage();
