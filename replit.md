# KidSpace - Child-Safe Video Platform

## Overview

KidSpace is a child-safe video platform with comprehensive parental controls. The application provides a safe environment for kids to explore educational videos, shorts, and chat with approved friends while giving parents full control over content access, screen time, and social interactions. Built as a full-stack TypeScript application with React frontend and Express backend.

## Features

### User Roles
- **Parent**: Full platform access, can create and manage child accounts, approve friend requests, set parental controls
- **Child**: Access to videos, shorts, explore, chat with approved friends, AI chatbot
- **Creator**: Can upload videos and shorts for the platform

### Core Features
1. **Home Page**: Welcome page with activity categories (Drawing, Stories, Science, Math, Music, Games)
2. **Explore Section**: YouTube-based video discovery with category filters (Drawing, Learning, Science, Fun, Music, Stories)
3. **Shorts Section**: Vertical scrolling short videos (Instagram/TikTok style)
4. **Chat System**: One-to-one messaging with parent-approved friends only
5. **Voice/Video Calling**: WebRTC-based calling between approved friends
6. **AI Chatbot**: Child-safe AI assistant using Cerebras AI with content filtering
7. **Creator Dashboard**: Video upload interface for creators
8. **Parent Dashboard**: Child management, permissions, friend approval, screen time controls, gamification settings
9. **Rewards System**: Gamification with points, badges, and feature unlocks to encourage learning

### Gamification System
- **Points**: Children earn points for watching videos (+5), asking chatbot questions (+2), and completing daily video goals (+10 bonus)
- **Badges**: 5 default badges unlock at 50, 100, 200, 300, 500 points with visual celebrations
- **Feature Unlocks**: Some badges unlock extra features (games, videos, shorts)
- **Parent Controls**: Parents can customize point values, daily limits, and enable/disable individual reward features per child
- **Celebration Popup**: Animated popup with confetti when children unlock new badges

### Security Features
- JWT-based authentication
- bcrypt password hashing
- Role-based access control
- Parent-approved friend system (no unapproved contacts)
- Content filtering in AI chatbot (blocks violence, adult content, drugs, etc.)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion for micro-interactions
- **Icons**: Lucide React for child-friendly iconography
- **WebRTC**: Native browser WebRTC APIs for voice/video calling

Frontend structure:
- `/client/src/pages/` - Route-level page components (Home, Explore, Shorts, Chat, Chatbot, ParentDashboard, CreatorDashboard, Login, Register)
- `/client/src/components/` - Reusable UI components
- `/client/src/components/ui/` - shadcn/ui primitive components
- `/client/src/hooks/` - Custom React hooks (use-auth, use-settings, use-toast)
- `/client/src/services/` - API service functions
- `/client/src/lib/` - Utility functions and query client configuration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: JWT tokens with bcrypt password hashing
- **WebSocket**: ws library for real-time chat and call signaling
- **API Design**: REST API with Zod validation

Backend structure:
- `/server/index.ts` - Server entry point and middleware
- `/server/routes.ts` - API route definitions with authentication
- `/server/storage.ts` - Database access layer
- `/server/auth-middleware.ts` - JWT authentication and role authorization
- `/server/db.ts` - Database connection
- `/server/vite.ts` - Vite dev server integration

### Shared Code
- `/shared/schema.ts` - Drizzle database schema definitions
- `/shared/routes.ts` - API route contracts with Zod schemas

### Database Schema
Tables:
1. **users** - User accounts (parent, child, creator) with optional parent linkage
2. **parental_settings** - Per-child settings (time limits, content permissions)
3. **content** - Videos and shorts with creator attribution
4. **friends** - Approved friend relationships
5. **friend_requests** - Pending friend requests awaiting parent approval
6. **messages** - Chat messages between approved friends
7. **call_history** - Voice/video call logs
8. **chatbot_conversations** - AI chatbot interaction history

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)

Optional (for full feature support):
- `SESSION_SECRET` - JWT signing secret (defaults provided)
- `YOUTUBE_API_KEY` - For Explore section video search
- `CEREBRAS_API_KEY` - For AI Chatbot functionality

## Development Commands

- `npm run dev` - Start development server
- `npm run db:push` - Sync database schema
- `npm run build` - Build for production
- `npm run start` - Run production build

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register parent/creator account
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user

### Children (Parent only)
- `GET /api/children/:parentId` - List children
- `POST /api/children/add` - Create child account

### Settings (Parent only)
- `GET /api/settings/:childId` - Get child settings
- `PATCH /api/settings/:childId` - Update child settings

### Content
- `GET /api/content` - List videos
- `GET /api/content/shorts` - List shorts
- `POST /api/content` - Upload video (Creator only)

### Friends
- `GET /api/friends/:userId` - List friends
- `GET /api/friends/requests/:userId` - Pending requests
- `GET /api/friends/pending-approval/:parentId` - Requests needing parent approval
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/approve/:requestId` - Approve request (Parent)
- `POST /api/friends/reject/:requestId` - Reject request (Parent)

### Messages
- `GET /api/messages/:userId/:friendId` - Get conversation
- `POST /api/messages` - Send message

### Explore
- `GET /api/explore/search` - Search YouTube videos
- `GET /api/explore/categories` - Get categories

### Chatbot
- `POST /api/chatbot/chat` - Send message to AI

## WebSocket Events

Connection: `ws://host/ws`

Events:
- `auth` - Authenticate user
- `chat-message` - Send/receive chat messages
- `call-offer` - Initiate call
- `call-answer` - Accept call
- `ice-candidate` - WebRTC ICE candidate exchange
- `call-end` - End call
- `call-reject` - Reject incoming call
