import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["parent", "child", "creator"] }).notNull().default("child"),
  avatar: text("avatar"),
  pin: text("pin"),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const parentalSettings = pgTable("parental_settings", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  dailyTimeLimitMinutes: integer("daily_time_limit_minutes").default(60),
  allowStories: boolean("allow_stories").default(true),
  allowLearning: boolean("allow_learning").default(true),
  allowCreativity: boolean("allow_creativity").default(true),
  allowMessaging: boolean("allow_messaging").default(true),
  allowExplore: boolean("allow_explore").default(true),
  allowShorts: boolean("allow_shorts").default(true),
  allowChatbot: boolean("allow_chatbot").default(true),
});

export const content = pgTable("content", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: ["story", "learning", "creativity", "short"] }).notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  videoUrl: text("video_url"),
  likes: integer("likes").default(0),
  creatorId: integer("creator_id"),
  duration: integer("duration"),
  isShort: boolean("is_short").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  status: text("status", { enum: ["pending", "pending_second_approval", "approved", "rejected"] }).notNull().default("pending"),
  approvedByParentId: integer("approved_by_parent_id"),
  secondParentId: integer("second_parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  friendId: integer("friend_id").notNull(),
  approvedByParentId: integer("approved_by_parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  fileUrl: text("file_url"),
  fileType: text("file_type"),
  fileName: text("file_name"),
  createdAt: timestamp("created_at").defaultNow(),
  read: boolean("read").default(false),
});

export const callHistory = pgTable("call_history", {
  id: serial("id").primaryKey(),
  callerId: integer("caller_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  callType: text("call_type", { enum: ["voice", "video"] }).notNull(),
  status: text("status", { enum: ["pending", "accepted", "rejected", "ended", "missed"] }).notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const chatbotConversations = pgTable("chatbot_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Gamification System Tables
export const childPoints = pgTable("child_points", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull().unique(),
  totalPoints: integer("total_points").default(0).notNull(),
  dailyVideosWatched: integer("daily_videos_watched").default(0),
  dailyChatbotQuestions: integer("daily_chatbot_questions").default(0),
  lastActivityDate: text("last_activity_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pointTransactions = pgTable("point_transactions", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconName: text("icon_name").notNull(),
  pointsRequired: integer("points_required").notNull(),
  unlocksFeature: text("unlocks_feature"),
  color: text("color").default("#FFD700"),
});

export const earnedBadges = pgTable("earned_badges", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  badgeId: integer("badge_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const gamificationSettings = pgTable("gamification_settings", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull().unique(),
  pointsPerVideo: integer("points_per_video").default(5),
  pointsPerDailyLimit: integer("points_per_daily_limit").default(10),
  pointsPerChatbotQuestion: integer("points_per_chatbot_question").default(2),
  pointsPerScreenTimeLimit: integer("points_per_screen_time_limit").default(10),
  dailyVideoLimit: integer("daily_video_limit").default(5),
  enableVideoPoints: boolean("enable_video_points").default(true),
  enableChatbotPoints: boolean("enable_chatbot_points").default(true),
  enableScreenTimePoints: boolean("enable_screen_time_points").default(true),
  enableBadges: boolean("enable_badges").default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertSettingsSchema = createInsertSchema(parentalSettings).omit({ id: true });
export const insertContentSchema = createInsertSchema(content).omit({ id: true, createdAt: true });
export const insertFriendRequestSchema = createInsertSchema(friendRequests).omit({ id: true, createdAt: true });
export const insertFriendSchema = createInsertSchema(friends).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertCallHistorySchema = createInsertSchema(callHistory).omit({ id: true, startedAt: true });
export const insertChatbotConversationSchema = createInsertSchema(chatbotConversations).omit({ id: true, createdAt: true });
export const insertChildPointsSchema = createInsertSchema(childPoints).omit({ id: true, updatedAt: true });
export const insertPointTransactionSchema = createInsertSchema(pointTransactions).omit({ id: true, createdAt: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true });
export const insertEarnedBadgeSchema = createInsertSchema(earnedBadges).omit({ id: true, earnedAt: true });
export const insertGamificationSettingsSchema = createInsertSchema(gamificationSettings).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ParentalSettings = typeof parentalSettings.$inferSelect;
export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type FriendRequest = typeof friendRequests.$inferSelect;
export type Friend = typeof friends.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type CallHistory = typeof callHistory.$inferSelect;
export type ChatbotConversation = typeof chatbotConversations.$inferSelect;
export type ChildPoints = typeof childPoints.$inferSelect;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type EarnedBadge = typeof earnedBadges.$inferSelect;
export type GamificationSettings = typeof gamificationSettings.$inferSelect;
