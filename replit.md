# Aidify - Healthcare Chat Assistant Platform

## Overview

Aidify is a comprehensive healthcare chat assistant platform that allows administrators to create, manage, and deploy AI-powered chatbots for healthcare support. The system includes role-based access control for administrators and care team members, with features like document management, chat logging, analytics, and PII redaction.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom theme support
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful endpoints with role-based middleware

### Database Layer
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Neon serverless driver with connection pooling

## Key Components

### Authentication System
- Session-based authentication with encrypted passwords (scrypt)
- Role-based access control (admin, careteam)
- Middleware protection for sensitive routes
- Automatic session management and cleanup

### AI Integration
- **Provider**: OpenAI GPT models (GPT-4o, GPT-4o Mini)
- **Features**: Streaming responses, vector store integration for RAG
- **PII Protection**: Automatic redaction using Compromise NLP
- **Fallback Handling**: Graceful error recovery with fallback responses

### Document Management
- File upload support (PDF, DOCX, TXT, RTF)
- Vector store integration for knowledge retrieval
- Automatic text processing and chunking
- Document association with specific chatbots

### Chat System
- Real-time streaming responses
- Conversation history management
- Session tracking and analytics
- Mobile-optimized interface with responsive design

## Data Flow

1. **User Authentication**: Login → Session creation → Role verification
2. **Chatbot Creation**: Admin creates chatbot → Vector store setup → Document upload
3. **Chat Interaction**: User query → PII redaction → AI processing → Response streaming
4. **Analytics**: Message logging → Data aggregation → Dashboard visualization
5. **Care Team Access**: Role-based chatbot assignment → Limited dashboard access

## External Dependencies

### Core Services
- **OpenAI API**: GPT model access and vector store operations
- **Neon Database**: Serverless PostgreSQL hosting
- **SendGrid**: Email notifications (configured but not actively used)

### Development Tools
- **Replit**: Primary development environment
- **Vite**: Development server and build system
- **Drizzle Kit**: Database schema management

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **Recharts**: Data visualization for analytics
- **React Hook Form**: Form state management

## Deployment Strategy

### Production Build
- Vite builds optimized client bundle to `dist/public`
- ESBuild compiles server code to `dist/index.js`
- Static assets served from Express with fallback to Vite in development

### Environment Configuration
- Development: Vite dev server with HMR
- Production: Express serves static files and API routes
- Database: Automatic connection to Neon PostgreSQL
- Sessions: Persistent storage in PostgreSQL

### Scaling Considerations
- Stateless server design enables horizontal scaling
- Database connection pooling for concurrent requests
- CDN-ready static asset structure
- Environment-specific configuration support

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- June 23, 2025: Implemented Common Messages database-backed feature
  - Added common_messages table to PostgreSQL schema with userId, kind (welcome/faq), and text fields
  - Created CRUD storage methods and API endpoints for managing common messages
  - Built CommonMessagesSettings component for Settings page with dark theme styling
  - Updated WelcomeInput and SuggestedQuestionInput to fetch from database instead of localStorage
  - Added save functionality in chatbot builder with proper API integration
  - Fixed API endpoint URLs and imports for proper functionality

## Changelog

Changelog:
- June 23, 2025. Initial setup