import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authenticateJWT, authorizeParent } from "./auth-middleware";
import { searchYouTubeForKids } from "./youtubeSafeSearch";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { filterMessage } from "./chatFilter"; 

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
              fileUrl: message.fileUrl,
              fileType: message.fileType,
              fileName: message.fileName,
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

  // Register object storage routes for file serving
  registerObjectStorageRoutes(app);

  // Authenticated file upload endpoint for chat attachments
  const objectStorageService = new ObjectStorageService();
  const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  app.post("/api/chat/upload-url", authenticateJWT, async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name || !contentType) {
        return res.status(400).json({ error: "Missing required fields: name, contentType" });
      }

      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(contentType)) {
        return res.status(400).json({ 
          error: "Invalid file type. Only PNG, JPG, JPEG, and PDF files are allowed." 
        });
      }

      // Validate file size
      if (size && size > MAX_FILE_SIZE) {
        return res.status(400).json({ 
          error: "File too large. Maximum size is 10MB." 
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
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

  app.get("/api/users/search", authenticateJWT, async (req, res) => {
    try {
      const { username } = req.query;
      if (!username || typeof username !== "string") {
        return res.status(400).json({ message: "Username required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
      });
    } catch (err) {
      console.error("User search error:", err);
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
      const result = await storage.approveFriendRequest(Number(req.params.requestId), parentId);
      
      if (result.needsSecondApproval) {
        res.json({ 
          message: "Your approval recorded! Waiting for the other child's parent to approve.",
          status: result.status 
        });
      } else if (result.status === "approved") {
        res.json({ message: "Friend request approved! The children can now chat.", status: "approved" });
      } else {
        res.json({ message: result.status, status: result.status });
      }
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
    const { senderId, receiverId, content, fileUrl, fileType, fileName } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ message: "Invalid message content" });
    }

    // 🔹 CHECK MESSAGE
    const cleanContent = filterMessage(content);

    // 🚫 BLOCK MESSAGE IF FILTERED
    if (cleanContent !== content) {
      return res.status(400).json({
        blocked: true,
        warning: "⚠️ Please keep the chat kind and safe. This message was not sent."
      });
    }

    // ✅ SAVE & SEND ONLY IF CLEAN
    const message = await storage.sendMessage({
      senderId,
      receiverId,
      content,
      fileUrl,
      fileType,
      fileName,
    });

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

  app.get("/api/explore/search", authenticateJWT, async (req, res) => {
    const user = req.user!;
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.json([]);
    }

    // If child → enforce parental controls
    if (user.role === "child") {
      const settings = await storage.getSettings(user.id);

      if (!settings || settings.allowExplore === false) {
        return res.json([]);
      }

      const videos = await searchYouTubeForKids(
        query,
        settings.allowShorts ?? true
      );

      return res.json(videos);
    }

    // Parent / Creator get filtered but less strict
    const videos = await searchYouTubeForKids(query, true);
    return res.json(videos);
  });

  app.post(api.chatbot.chat.path, authenticateJWT, async (req, res) => {
    try {
      const { userId, message, fileUrl, fileType, fileName, fileBase64 } = req.body;

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
      
      // Handle image files - acknowledge and offer to help
      if (fileType?.startsWith('image/')) {
        const imageResponse = `I can see you shared a picture called "${fileName}"! That's so cool! While I can't look at pictures directly, I'd love to help you with it! Can you tell me what's in the picture? Or maybe you have a question about something you see? I'm here to help you learn and have fun!`;
        await storage.createChatbotConversation(userId, `[Image: ${fileName}] ${message}`, imageResponse);
        return res.json({ response: imageResponse });
      }

      // Handle PDF files
      if (fileType === 'application/pdf') {
        const pdfResponse = `I can see you shared a PDF file called "${fileName}"! That's awesome! While I can't read PDFs directly, I'd love to help you understand it. Can you tell me what the PDF is about or read me a part of it? Then I can help explain it in a fun way!`;
        await storage.createChatbotConversation(userId, `[PDF: ${fileName}] ${message}`, pdfResponse);
        return res.json({ response: pdfResponse });
      }
      
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

  // ============ GAMIFICATION API ============

  // Get child's points and progress
  app.get("/api/gamification/points/:childId", authenticateJWT, async (req, res) => {
    const childId = parseInt(req.params.childId);
    const user = (req as any).user;
    
    // Allow child to view own points or parent to view their child's
    if (user.role === "child" && user.id !== childId) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (user.role === "parent") {
      const children = await storage.getChildrenByParent(user.id);
      if (!children.find(c => c.id === childId)) {
        return res.status(403).json({ message: "Not your child" });
      }
    }
    
    const points = await storage.getOrCreateChildPoints(childId);
    res.json(points);
  });

  // Get all badges
  app.get("/api/gamification/badges", authenticateJWT, async (req, res) => {
    const badges = await storage.getAllBadges();
    res.json(badges);
  });

  // Get child's earned badges
  app.get("/api/gamification/badges/:childId", authenticateJWT, async (req, res) => {
    const childId = parseInt(req.params.childId);
    const user = (req as any).user;
    
    if (user.role === "child" && user.id !== childId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const earnedBadges = await storage.getEarnedBadges(childId);
    res.json(earnedBadges);
  });

  // Get gamification settings for a child
  app.get("/api/gamification/settings/:childId", authenticateJWT, authorizeParent, async (req, res) => {
    const childId = parseInt(req.params.childId);
    const user = (req as any).user;
    
    const children = await storage.getChildrenByParent(user.id);
    if (!children.find(c => c.id === childId)) {
      return res.status(403).json({ message: "Not your child" });
    }
    
    const settings = await storage.getOrCreateGamificationSettings(childId);
    res.json(settings);
  });

  // Update gamification settings for a child
  app.patch("/api/gamification/settings/:childId", authenticateJWT, authorizeParent, async (req, res) => {
    const childId = parseInt(req.params.childId);
    const user = (req as any).user;
    
    const children = await storage.getChildrenByParent(user.id);
    if (!children.find(c => c.id === childId)) {
      return res.status(403).json({ message: "Not your child" });
    }
    
    const updated = await storage.updateGamificationSettings(childId, req.body);
    res.json(updated);
  });

  // Get point history for a child
  app.get("/api/gamification/history/:childId", authenticateJWT, async (req, res) => {
    const childId = parseInt(req.params.childId);
    const user = (req as any).user;
    
    if (user.role === "child" && user.id !== childId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const transactions = await storage.getPointTransactions(childId);
    res.json(transactions);
  });

  // Award video watch points (called when child watches a video)
  app.post("/api/gamification/video-watched", authenticateJWT, async (req, res) => {
    const user = (req as any).user;
    if (user.role !== "child") {
      return res.status(403).json({ message: "Only children earn points" });
    }
    
    const settings = await storage.getOrCreateGamificationSettings(user.id);
    if (!settings.enableVideoPoints) {
      return res.json({ points: 0, message: "Video points disabled" });
    }
    
    const dailyCount = await storage.incrementDailyVideoCount(user.id);
    const pointsToAdd = settings.pointsPerVideo || 5;
    
    let result = await storage.addPoints(user.id, pointsToAdd, "Watched a video");
    
    // Bonus for completing daily limit
    if (dailyCount === settings.dailyVideoLimit) {
      const bonusResult = await storage.addPoints(user.id, settings.pointsPerDailyLimit || 10, "Completed daily video goal!");
      result.newBadges = [...result.newBadges, ...bonusResult.newBadges];
      result.childPoints = bonusResult.childPoints;
    }
    
    res.json({ 
      pointsEarned: pointsToAdd,
      totalPoints: result.childPoints.totalPoints,
      newBadges: result.newBadges,
      dailyCount,
      dailyLimit: settings.dailyVideoLimit
    });
  });

  // Award chatbot question points
  app.post("/api/gamification/chatbot-question", authenticateJWT, async (req, res) => {
    const user = (req as any).user;
    if (user.role !== "child") {
      return res.json({ points: 0 });
    }
    
    const settings = await storage.getOrCreateGamificationSettings(user.id);
    if (!settings.enableChatbotPoints) {
      return res.json({ points: 0 });
    }
    
    await storage.incrementDailyChatbotCount(user.id);
    const pointsToAdd = settings.pointsPerChatbotQuestion || 2;
    const result = await storage.addPoints(user.id, pointsToAdd, "Asked the chatbot a question");
    
    res.json({
      pointsEarned: pointsToAdd,
      totalPoints: result.childPoints.totalPoints,
      newBadges: result.newBadges
    });
  });

  // Get full gamification dashboard data for a child
  app.get("/api/gamification/dashboard/:childId", authenticateJWT, async (req, res) => {
    const childId = parseInt(req.params.childId);
    const user = (req as any).user;
    
    if (user.role === "child" && user.id !== childId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const [points, earnedBadges, allBadges, settings, history] = await Promise.all([
      storage.getOrCreateChildPoints(childId),
      storage.getEarnedBadges(childId),
      storage.getAllBadges(),
      storage.getOrCreateGamificationSettings(childId),
      storage.getPointTransactions(childId, 10)
    ]);
    
    // Calculate next badge
    const earnedBadgeIds = new Set(earnedBadges.map(e => e.badgeId));
    const nextBadge = allBadges.find(b => !earnedBadgeIds.has(b.id) && b.pointsRequired > points.totalPoints);
    const progressToNext = nextBadge 
      ? Math.round((points.totalPoints / nextBadge.pointsRequired) * 100)
      : 100;
    
    res.json({
      points,
      earnedBadges: earnedBadges.map(e => e.badge),
      allBadges,
      nextBadge,
      progressToNext,
      settings,
      recentHistory: history
    });
  });

  await seedDatabase();

  return httpServer;
}

export async function seedDatabase() {
  try {
    // Seed default badges
    await storage.seedDefaultBadges();
    
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
