# KidSpace - Children's Educational Content Platform

## Overview

KidSpace is a child-friendly educational content platform with parental controls. The application provides a safe space for kids to explore stories, learning activities, and creative content while giving parents granular control over screen time and content access. Built as a full-stack TypeScript application with a React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Icons**: Lucide React for consistent, child-friendly iconography

The frontend follows a component-based architecture with:
- `/client/src/pages/` - Route-level page components
- `/client/src/components/` - Reusable UI components including navigation and content cards
- `/client/src/components/ui/` - shadcn/ui primitive components
- `/client/src/hooks/` - Custom React hooks for data fetching (users, settings, content)
- `/client/src/lib/` - Utility functions and query client configuration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **API Design**: REST API with Zod validation for type-safe request/response handling
- **Session Storage**: connect-pg-simple for PostgreSQL session storage

The backend follows a layered architecture:
- `/server/index.ts` - Server entry point and middleware configuration
- `/server/routes.ts` - API route definitions with Zod validation
- `/server/storage.ts` - Data access layer implementing IStorage interface
- `/server/db.ts` - Database connection configuration

### Shared Code
- `/shared/schema.ts` - Drizzle database schema definitions and Zod schemas
- `/shared/routes.ts` - API route contracts with input/output type definitions

### Database Schema
Three main tables:
1. **users** - Stores parent and kid accounts with role-based access
2. **parental_settings** - Screen time limits and content category permissions per child
3. **content** - Educational content items (stories, learning, creativity) with metadata

### Build System
Custom build script using esbuild for server bundling and Vite for client bundling. Bundles commonly used server dependencies to reduce cold start times on deployment.

## External Dependencies

### Database
- **PostgreSQL** - Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle Kit** - Database migration tool, run `npm run db:push` to sync schema

### Frontend Libraries
- **@tanstack/react-query** - Server state management
- **@radix-ui/*** - Accessible UI primitives for shadcn components
- **framer-motion** - Animation library
- **wouter** - Lightweight router
- **react-day-picker** - Date picker component
- **embla-carousel-react** - Carousel functionality
- **react-hook-form** with **@hookform/resolvers** - Form handling with Zod validation

### Backend Libraries
- **express** - Web server framework
- **drizzle-orm** - Type-safe ORM
- **zod** - Runtime type validation
- **connect-pg-simple** - PostgreSQL session store

### Development Tools
- **Vite** - Frontend dev server and bundler with HMR
- **tsx** - TypeScript execution for development
- **esbuild** - Production bundling for server code
- **tailwindcss** with **tailwindcss-animate** - Styling utilities

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal** - Development error overlay
- **@replit/vite-plugin-cartographer** - Development tooling (dev only)