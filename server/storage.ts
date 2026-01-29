import { db } from "./db";
import {
  users, parentalSettings, content, friends, friendRequests, messages, callHistory, chatbotConversations,
  childPoints, pointTransactions, badges, earnedBadges, gamificationSettings,
  type User, type InsertUser,
  type ParentalSettings,
  type Content, type InsertContent,
  type Friend, type FriendRequest, type Message, type InsertMessage,
  type CallHistory, type ChatbotConversation,
  type ChildPoints, type PointTransaction, type Badge, type EarnedBadge, type GamificationSettings
} from "@shared/schema";
import { eq, and, or, desc, lte } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getChildrenByParent(parentId: number): Promise<User[]>;
  getSettings(childId: number): Promise<ParentalSettings | undefined>;
  updateSettings(childId: number, settings: Partial<ParentalSettings>): Promise<ParentalSettings>;
  getContent(): Promise<Content[]>;
  getShorts(): Promise<Content[]>;
  createContent(item: InsertContent): Promise<Content>;
  getFriends(userId: number): Promise<Friend[]>;
  getFriendRequests(userId: number): Promise<FriendRequest[]>;
  getPendingApprovalRequests(parentId: number): Promise<FriendRequest[]>;
  createFriendRequest(fromUserId: number, toUserId: number): Promise<FriendRequest>;
  approveFriendRequest(requestId: number, parentId: number): Promise<{ status: string; needsSecondApproval: boolean }>;
  rejectFriendRequest(requestId: number): Promise<void>;
  getMessages(userId: number, friendId: number): Promise<Message[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  createChatbotConversation(userId: number, userMessage: string, botResponse: string): Promise<ChatbotConversation>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      avatar: insertUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${insertUser.username}`,
    }).returning();
    return user;
  }

  async getChildrenByParent(parentId: number): Promise<User[]> {
    return db.select().from(users).where(eq(users.parentId, parentId));
  }

  async getSettings(childId: number): Promise<ParentalSettings | undefined> {
    const [settings] = await db.select().from(parentalSettings).where(eq(parentalSettings.childId, childId));
    return settings;
  }

  async updateSettings(childId: number, updates: Partial<ParentalSettings>): Promise<ParentalSettings> {
    const existing = await this.getSettings(childId);
    if (!existing) {
      const [newSettings] = await db.insert(parentalSettings).values({
        childId,
        dailyTimeLimitMinutes: updates.dailyTimeLimitMinutes ?? 60,
        allowStories: updates.allowStories ?? true,
        allowLearning: updates.allowLearning ?? true,
        allowCreativity: updates.allowCreativity ?? true,
        allowMessaging: updates.allowMessaging ?? true,
        allowExplore: updates.allowExplore ?? true,
        allowShorts: updates.allowShorts ?? true,
        allowChatbot: updates.allowChatbot ?? true,
      }).returning();
      return newSettings;
    }
    const [updated] = await db.update(parentalSettings)
      .set(updates)
      .where(eq(parentalSettings.childId, childId))
      .returning();
    return updated;
  }

  async getContent(): Promise<Content[]> {
    return db.select().from(content).where(eq(content.isShort, false)).orderBy(desc(content.createdAt));
  }

  async getShorts(): Promise<Content[]> {
    return db.select().from(content).where(eq(content.isShort, true)).orderBy(desc(content.createdAt));
  }

  async createContent(item: InsertContent): Promise<Content> {
    const [newContent] = await db.insert(content).values(item).returning();
    return newContent;
  }

  async getFriends(userId: number): Promise<Friend[]> {
    return db.select().from(friends).where(
      or(eq(friends.userId, userId), eq(friends.friendId, userId))
    );
  }

  async getFriendRequests(userId: number): Promise<FriendRequest[]> {
    return db.select().from(friendRequests).where(
      and(eq(friendRequests.toUserId, userId), eq(friendRequests.status, "pending"))
    );
  }

  async getPendingApprovalRequests(parentId: number): Promise<any[]> {
    const children = await this.getChildrenByParent(parentId);
    const childIds = children.map(c => c.id);
    if (childIds.length === 0) return [];
    
    const requests: any[] = [];
    for (const childId of childIds) {
      const childRequests = await db.select().from(friendRequests).where(
        and(
          or(eq(friendRequests.fromUserId, childId), eq(friendRequests.toUserId, childId)),
          or(eq(friendRequests.status, "pending"), eq(friendRequests.status, "pending_second_approval"))
        )
      );
      
      for (const req of childRequests) {
        if (req.status === "pending_second_approval" && req.approvedByParentId === parentId) {
          continue;
        }
        
        const [fromUser] = await db.select().from(users).where(eq(users.id, req.fromUserId));
        const [toUser] = await db.select().from(users).where(eq(users.id, req.toUserId));
        
        requests.push({
          ...req,
          fromUsername: fromUser?.username,
          toUsername: toUser?.username,
          fromParentId: fromUser?.parentId,
          toParentId: toUser?.parentId,
          sameParent: fromUser?.parentId === toUser?.parentId,
        });
      }
    }
    return requests;
  }

  async createFriendRequest(fromUserId: number, toUserId: number): Promise<FriendRequest> {
    const [request] = await db.insert(friendRequests).values({
      fromUserId,
      toUserId,
      status: "pending",
    }).returning();
    return request;
  }

  async approveFriendRequest(requestId: number, parentId: number): Promise<{ status: string; needsSecondApproval: boolean }> {
    const [request] = await db.select().from(friendRequests).where(eq(friendRequests.id, requestId));
    if (!request) return { status: "not_found", needsSecondApproval: false };

    const [fromUser] = await db.select().from(users).where(eq(users.id, request.fromUserId));
    const [toUser] = await db.select().from(users).where(eq(users.id, request.toUserId));
    
    if (!fromUser || !toUser) return { status: "user_not_found", needsSecondApproval: false };

    const sameParent = fromUser.parentId === toUser.parentId;
    
    if (sameParent) {
      await db.update(friendRequests)
        .set({ status: "approved", approvedByParentId: parentId })
        .where(eq(friendRequests.id, requestId));

      await db.insert(friends).values({
        userId: request.fromUserId,
        friendId: request.toUserId,
        approvedByParentId: parentId,
      });
      return { status: "approved", needsSecondApproval: false };
    }
    
    if (request.status === "pending") {
      await db.update(friendRequests)
        .set({ status: "pending_second_approval", approvedByParentId: parentId })
        .where(eq(friendRequests.id, requestId));
      return { status: "pending_second_approval", needsSecondApproval: true };
    }
    
    if (request.status === "pending_second_approval" && request.approvedByParentId !== parentId) {
      await db.update(friendRequests)
        .set({ status: "approved", secondParentId: parentId })
        .where(eq(friendRequests.id, requestId));

      await db.insert(friends).values({
        userId: request.fromUserId,
        friendId: request.toUserId,
        approvedByParentId: request.approvedByParentId!,
      });
      return { status: "approved", needsSecondApproval: false };
    }
    
    return { status: "already_approved_by_you", needsSecondApproval: false };
  }

  async rejectFriendRequest(requestId: number): Promise<void> {
    await db.update(friendRequests)
      .set({ status: "rejected" })
      .where(eq(friendRequests.id, requestId));
  }

  async getMessages(userId: number, friendId: number): Promise<Message[]> {
    return db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId), eq(messages.receiverId, friendId)),
        and(eq(messages.senderId, friendId), eq(messages.receiverId, userId))
      )
    ).orderBy(messages.createdAt);
  }

  async sendMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async createChatbotConversation(userId: number, userMessage: string, botResponse: string): Promise<ChatbotConversation> {
    const [conversation] = await db.insert(chatbotConversations).values({
      userId,
      message: userMessage,
      response: botResponse,
    }).returning();
    return conversation;
  }

  // Gamification Methods
  async getChildPoints(childId: number): Promise<ChildPoints | undefined> {
    const [points] = await db.select().from(childPoints).where(eq(childPoints.childId, childId));
    return points;
  }

  async getOrCreateChildPoints(childId: number): Promise<ChildPoints> {
    let points = await this.getChildPoints(childId);
    if (!points) {
      const today = new Date().toISOString().split('T')[0];
      const [newPoints] = await db.insert(childPoints).values({
        childId,
        totalPoints: 0,
        dailyVideosWatched: 0,
        dailyChatbotQuestions: 0,
        lastActivityDate: today,
      }).returning();
      points = newPoints;
    }
    return points;
  }

  async addPoints(childId: number, points: number, reason: string): Promise<{ childPoints: ChildPoints; newBadges: Badge[] }> {
    const today = new Date().toISOString().split('T')[0];
    let current = await this.getOrCreateChildPoints(childId);
    
    // Reset daily counters if new day
    if (current.lastActivityDate !== today) {
      await db.update(childPoints)
        .set({ dailyVideosWatched: 0, dailyChatbotQuestions: 0, lastActivityDate: today })
        .where(eq(childPoints.childId, childId));
      current = await this.getOrCreateChildPoints(childId);
    }
    
    const newTotal = current.totalPoints + points;
    
    await db.update(childPoints)
      .set({ totalPoints: newTotal, updatedAt: new Date() })
      .where(eq(childPoints.childId, childId));
    
    await db.insert(pointTransactions).values({
      childId,
      points,
      reason,
    });
    
    // Check for new badges
    const newBadges = await this.checkAndAwardBadges(childId, newTotal);
    
    const updated = await this.getOrCreateChildPoints(childId);
    return { childPoints: updated, newBadges };
  }

  async incrementDailyVideoCount(childId: number): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    let current = await this.getOrCreateChildPoints(childId);
    
    if (current.lastActivityDate !== today) {
      await db.update(childPoints)
        .set({ dailyVideosWatched: 1, lastActivityDate: today })
        .where(eq(childPoints.childId, childId));
      return 1;
    }
    
    const newCount = (current.dailyVideosWatched || 0) + 1;
    await db.update(childPoints)
      .set({ dailyVideosWatched: newCount })
      .where(eq(childPoints.childId, childId));
    return newCount;
  }

  async incrementDailyChatbotCount(childId: number): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    let current = await this.getOrCreateChildPoints(childId);
    
    if (current.lastActivityDate !== today) {
      await db.update(childPoints)
        .set({ dailyChatbotQuestions: 1, lastActivityDate: today })
        .where(eq(childPoints.childId, childId));
      return 1;
    }
    
    const newCount = (current.dailyChatbotQuestions || 0) + 1;
    await db.update(childPoints)
      .set({ dailyChatbotQuestions: newCount })
      .where(eq(childPoints.childId, childId));
    return newCount;
  }

  async getAllBadges(): Promise<Badge[]> {
    return db.select().from(badges).orderBy(badges.pointsRequired);
  }

  async getEarnedBadges(childId: number): Promise<(EarnedBadge & { badge: Badge })[]> {
    const earned = await db.select().from(earnedBadges).where(eq(earnedBadges.childId, childId));
    const allBadges = await this.getAllBadges();
    
    return earned.map(e => ({
      ...e,
      badge: allBadges.find(b => b.id === e.badgeId)!
    })).filter(e => e.badge);
  }

  async checkAndAwardBadges(childId: number, totalPoints: number): Promise<Badge[]> {
    const allBadges = await this.getAllBadges();
    const earnedBadgesList = await db.select().from(earnedBadges).where(eq(earnedBadges.childId, childId));
    const earnedBadgeIds = new Set(earnedBadgesList.map(e => e.badgeId));
    
    const newBadges: Badge[] = [];
    
    for (const badge of allBadges) {
      if (totalPoints >= badge.pointsRequired && !earnedBadgeIds.has(badge.id)) {
        await db.insert(earnedBadges).values({
          childId,
          badgeId: badge.id,
        });
        newBadges.push(badge);
      }
    }
    
    return newBadges;
  }

  async getGamificationSettings(childId: number): Promise<GamificationSettings | undefined> {
    const [settings] = await db.select().from(gamificationSettings).where(eq(gamificationSettings.childId, childId));
    return settings;
  }

  async getOrCreateGamificationSettings(childId: number): Promise<GamificationSettings> {
    let settings = await this.getGamificationSettings(childId);
    if (!settings) {
      try {
        const [newSettings] = await db.insert(gamificationSettings).values({
          childId,
        }).returning();
        settings = newSettings;
      } catch (err: any) {
        // Race condition: another process may have inserted the row concurrently.
        // Postgres unique constraint error code is '23505'. If that happens, re-query.
        if (err?.code === '23505') {
          settings = await this.getGamificationSettings(childId);
        } else {
          throw err;
        }
      }
    }

    if (!settings) {
      // Defensive fallback to avoid returning undefined
      throw new Error("Failed to create or fetch gamification settings");
    }

    return settings;
  }

  async updateGamificationSettings(childId: number, updates: Partial<GamificationSettings>): Promise<GamificationSettings> {
    await this.getOrCreateGamificationSettings(childId);
    const [updated] = await db.update(gamificationSettings)
      .set(updates)
      .where(eq(gamificationSettings.childId, childId))
      .returning();
    return updated;
  }

  async getPointTransactions(childId: number, limit = 20): Promise<PointTransaction[]> {
    return db.select().from(pointTransactions)
      .where(eq(pointTransactions.childId, childId))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(limit);
  }

  async seedDefaultBadges(): Promise<void> {
    const existing = await this.getAllBadges();
    if (existing.length > 0) return;
    
    const defaultBadges = [
      { name: "Starter Star", description: "You're just getting started! Keep going!", iconName: "Star", pointsRequired: 50, color: "#FFD700", unlocksFeature: null },
      { name: "Creative Kid", description: "You're becoming more creative every day!", iconName: "Palette", pointsRequired: 100, color: "#FF6B6B", unlocksFeature: "extra_games" },
      { name: "Smart Thinker", description: "Your brain is growing stronger!", iconName: "Brain", pointsRequired: 200, color: "#4ECDC4", unlocksFeature: "extra_videos" },
      { name: "Explorer", description: "You love discovering new things!", iconName: "Compass", pointsRequired: 300, color: "#45B7D1", unlocksFeature: "shorts" },
      { name: "Super Learner", description: "You're a learning superstar!", iconName: "Trophy", pointsRequired: 500, color: "#96CEB4", unlocksFeature: "premium_content" },
    ];
    
    for (const badge of defaultBadges) {
      await db.insert(badges).values(badge);
    }
  }
}

export const storage = new DatabaseStorage();
