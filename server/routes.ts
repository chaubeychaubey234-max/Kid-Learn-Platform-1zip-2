import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { authenticateJWT, authorizeParent } from "./auth-middleware";

const JWT_SECRET = process.env.SESSION_SECRET || "default-secret-key";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Health check route
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "kid-learning-backend" });
  });

  // Auth
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, role, name, email } = req.body;
      
      if (!username || !password || !role) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        username,
        password,
        role,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      });

      res.status(201).json({ 
        id: user.id, 
        username: user.username, 
        role: user.role 
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        token
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Users
  app.get(api.users.list.path, async (req, res) => {
    // In a real app, this would be filtered or protected
    res.json([]);
  });

  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.post(api.users.create.path, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const user = await storage.createUser(input);
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Settings
  app.get(api.settings.get.path, async (req, res) => {
    const settings = await storage.getSettings(Number(req.params.kidId));
    if (!settings) return res.status(404).json({ message: "Settings not found" });
    res.json(settings);
  });

  app.patch(api.settings.update.path, authenticateJWT, authorizeParent, async (req, res) => {
    try {
      const input = api.settings.update.input.parse(req.body);
      const settings = await storage.updateSettings(Number(req.params.kidId), input);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Content
  app.get(api.content.list.path, async (req, res) => {
    const content = await storage.getContent();
    res.json(content);
  });

  await seedDatabase();

  return httpServer;
}

// Seed function to add initial data
export async function seedDatabase() {
  const content = await storage.getContent();
  if (content.length === 0) {
    await storage.createContent({
      title: "Drawing Animals",
      description: "Learn how to draw cute animals step by step!",
      type: "creativity",
      thumbnailUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80",
      videoUrl: "https://www.youtube.com/watch?v=example",
      likes: 1200
    });
    await storage.createContent({
      title: "Science Experiments",
      description: "Fun and safe science experiments to do at home.",
      type: "learning",
      thumbnailUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80",
      videoUrl: "https://www.youtube.com/watch?v=example2",
      likes: 850
    });
    await storage.createContent({
      title: "Story Time Adventures",
      description: "Magical stories for bedtime.",
      type: "story",
      thumbnailUrl: "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?w=800&q=80",
      videoUrl: "https://www.youtube.com/watch?v=example3",
      likes: 2300
    });
    // Create a default kid user
    const kid = await storage.createUser({
      username: "alex",
      password: "password123", // In real app, hash this
      role: "kid",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
    });
    // Initialize settings
    await storage.updateSettings(kid.id, {
      dailyTimeLimitMinutes: 60,
      allowStories: true,
      allowLearning: true,
      allowCreativity: true,
      allowMessaging: true
    });
  }
}
