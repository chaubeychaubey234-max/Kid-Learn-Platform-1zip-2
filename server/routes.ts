import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authenticateJWT, authorizeParent } from "./auth-middleware";

const JWT_SECRET = process.env.SESSION_SECRET || "default-secret-key";
const SALT_ROUNDS = 10;

const connectedClients: Map<number, WebSocket> = new Map();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    let userId: number | null = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "auth") {
          userId = message.userId;
          if (userId !== null) {
            connectedClients.set(userId, ws);
          }
        }
        
        if (message.type === "call-offer" || message.type === "call-answer" || 
            message.type === "ice-candidate" || message.type === "call-end" ||
            message.type === "call-reject") {
          const targetWs = connectedClients.get(message.targetUserId);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              ...message,
              fromUserId: userId,
            }));
          }
        }

        if (message.type === "chat-message") {
          const targetWs = connectedClients.get(message.receiverId);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: "chat-message",
              senderId: userId,
              content: message.content,
            }));
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.on("close", () => {
      if (userId !== null) {
        connectedClients.delete(userId);
      }
    });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "kid-video-platform" });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, role, parentId } = req.body;
      
      if (!username || !password || !role) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (role === "child" && !parentId) {
        return res.status(400).json({ message: "Child accounts must be created by a parent" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role,
        parentId: role === "child" ? parentId : null,
      });

      if (role === "child") {
        await storage.updateSettings(user.id, {});
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(201).json({ 
        id: user.id, 
        username: user.username, 
        role: user.role,
        token,
      });
    } catch (err) {
      console.error("Register error:", err);
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
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
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
        parentId: user.parentId,
        avatar: user.avatar,
        token,
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateJWT, async (req, res) => {
    try {
      const user = await storage.getUser((req as any).user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        parentId: user.parentId,
        avatar: user.avatar,
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.get(api.children.list.path, authenticateJWT, async (req, res) => {
    const children = await storage.getChildrenByParent(Number(req.params.parentId));
    res.json(children);
  });

  app.post(api.children.add.path, authenticateJWT, authorizeParent, async (req, res) => {
    try {
      const { parentId, username, password } = req.body;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const child = await storage.createUser({
        username,
        password: hashedPassword,
        role: "child",
        parentId,
      });

      await storage.updateSettings(child.id, {});

      res.status(201).json(child);
    } catch (err) {
      console.error("Add child error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.settings.get.path, async (req, res) => {
    const settings = await storage.getSettings(Number(req.params.childId));
    if (!settings) return res.status(404).json({ message: "Settings not found" });
    res.json(settings);
  });

  app.patch(api.settings.update.path, authenticateJWT, authorizeParent, async (req, res) => {
    try {
      const settings = await storage.updateSettings(Number(req.params.childId), req.body);
      res.json(settings);
    } catch (err) {
      console.error("Update settings error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.content.list.path, async (req, res) => {
    const contentList = await storage.getContent();
    res.json(contentList);
  });

  app.get(api.content.shorts.path, async (req, res) => {
    const shorts = await storage.getShorts();
    res.json(shorts);
  });

  app.post(api.content.create.path, authenticateJWT, async (req, res) => {
    try {
      const newContent = await storage.createContent(req.body);
      res.status(201).json(newContent);
    } catch (err) {
      console.error("Create content error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.friends.list.path, authenticateJWT, async (req, res) => {
    const friendsList = await storage.getFriends(Number(req.params.userId));
    res.json(friendsList);
  });

  app.get(api.friends.requests.path, authenticateJWT, async (req, res) => {
    const requests = await storage.getFriendRequests(Number(req.params.userId));
    res.json(requests);
  });

  app.get(api.friends.pendingApproval.path, authenticateJWT, authorizeParent, async (req, res) => {
    const requests = await storage.getPendingApprovalRequests(Number(req.params.parentId));
    res.json(requests);
  });

  app.post(api.friends.sendRequest.path, authenticateJWT, async (req, res) => {
    try {
      const { fromUserId, toUserId } = req.body;
      const request = await storage.createFriendRequest(fromUserId, toUserId);
      res.status(201).json(request);
    } catch (err) {
      console.error("Send friend request error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.friends.approveRequest.path, authenticateJWT, authorizeParent, async (req, res) => {
    try {
      const parentId = (req as any).user.id;
      await storage.approveFriendRequest(Number(req.params.requestId), parentId);
      res.json({ message: "Friend request approved" });
    } catch (err) {
      console.error("Approve friend request error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.friends.rejectRequest.path, authenticateJWT, authorizeParent, async (req, res) => {
    try {
      await storage.rejectFriendRequest(Number(req.params.requestId));
      res.json({ message: "Friend request rejected" });
    } catch (err) {
      console.error("Reject friend request error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.messages.list.path, authenticateJWT, async (req, res) => {
    const messagesList = await storage.getMessages(
      Number(req.params.userId),
      Number(req.params.friendId)
    );
    res.json(messagesList);
  });

  app.post(api.messages.send.path, authenticateJWT, async (req, res) => {
    try {
      const message = await storage.sendMessage(req.body);
      res.status(201).json(message);
    } catch (err) {
      console.error("Send message error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.explore.categories.path, (_req, res) => {
    const categories = [
      { name: "Drawing", query: "drawing for kids" },
      { name: "Learning", query: "educational videos for kids" },
      { name: "Science", query: "science experiments for kids" },
      { name: "Fun", query: "fun videos for kids" },
      { name: "Music", query: "kids songs" },
      { name: "Stories", query: "kids stories" },
    ];
    res.json(categories);
  });

  app.get(api.explore.search.path, async (req, res) => {
    try {
      const { q, category } = req.query;
      const searchQuery = q || category || "kids educational videos";
      
      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      if (!YOUTUBE_API_KEY) {
        return res.json([]);
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(searchQuery as string)}&type=video&safeSearch=strict&key=${YOUTUBE_API_KEY}`
      );
      
      const data = await response.json();
      
      if (!data.items) {
        return res.json([]);
      }

      const videos = data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
      }));

      res.json(videos);
    } catch (err) {
      console.error("Explore search error:", err);
      res.json([]);
    }
  });

  app.post(api.chatbot.chat.path, authenticateJWT, async (req, res) => {
    try {
      const { userId, message } = req.body;

      const blockedTopics = [
        "violence", "violent", "kill", "murder", "fight", "weapon", "gun", "knife",
        "sex", "sexual", "naked", "nude", "porn",
        "drug", "drugs", "alcohol", "cigarette", "smoking", "weed", "marijuana",
        "suicide", "self-harm", "hurt myself", "die",
        "curse", "swear", "bad words",
      ];

      const lowerMessage = message.toLowerCase();
      const isBlocked = blockedTopics.some(topic => lowerMessage.includes(topic));

      if (isBlocked) {
        const safeResponse = "I'm sorry, but I can't talk about that topic. Let's chat about something fun instead! Would you like to hear a joke, learn a fun fact, or talk about your favorite animals?";
        await storage.createChatbotConversation(userId, message, safeResponse);
        return res.json({ response: safeResponse });
      }

      const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
      
      if (!CEREBRAS_API_KEY) {
        const defaultResponse = "Hi there! I'm your friendly assistant. I'm here to help you learn and have fun! What would you like to talk about?";
        await storage.createChatbotConversation(userId, message, defaultResponse);
        return res.json({ response: defaultResponse });
      }

      const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CEREBRAS_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3.1-8b",
          messages: [
            {
              role: "system",
              content: "You are a friendly, child-safe assistant for kids. Keep responses short, fun, and educational. Never discuss violence, adult content, drugs, or harmful topics. If asked about inappropriate topics, politely redirect to safe topics like animals, science, stories, or games."
            },
            { role: "user", content: message }
          ],
          max_tokens: 200,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        console.error("Cerebras API error:", data.error);
        const errorResponse = "I'm having a little trouble right now. Let's try again in a moment!";
        await storage.createChatbotConversation(userId, message, errorResponse);
        return res.json({ response: errorResponse });
      }
      
      const botResponse = data.choices?.[0]?.message?.content || "I'm here to help! What would you like to know?";

      await storage.createChatbotConversation(userId, message, botResponse);
      res.json({ response: botResponse });
    } catch (err) {
      console.error("Chatbot error:", err);
      res.json({ response: "I'm having trouble thinking right now. Let's try again!" });
    }
  });

  await seedDatabase();

  return httpServer;
}

export async function seedDatabase() {
  try {
    const contentList = await storage.getContent();
    if (contentList.length === 0) {
      await storage.createContent({
        title: "Drawing Animals",
        description: "Learn how to draw cute animals step by step!",
        type: "creativity",
        thumbnailUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80",
        videoUrl: "https://www.youtube.com/watch?v=example",
        likes: 1200,
        isShort: false,
      });
      await storage.createContent({
        title: "Science Experiments",
        description: "Fun and safe science experiments to do at home.",
        type: "learning",
        thumbnailUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80",
        videoUrl: "https://www.youtube.com/watch?v=example2",
        likes: 850,
        isShort: false,
      });
      await storage.createContent({
        title: "Fun Dance Moves",
        description: "Quick dance tutorial for kids!",
        type: "creativity",
        thumbnailUrl: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80",
        videoUrl: "https://www.youtube.com/shorts/example",
        likes: 2300,
        isShort: true,
        duration: 30,
      });
      await storage.createContent({
        title: "Magic Trick",
        description: "Learn this cool magic trick!",
        type: "creativity",
        thumbnailUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
        videoUrl: "https://www.youtube.com/shorts/example2",
        likes: 1800,
        isShort: true,
        duration: 45,
      });
    }
  } catch (err) {
    console.error("Seed database error:", err);
  }
}
