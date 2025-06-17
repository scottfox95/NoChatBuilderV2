import { 
  users, 
  chatbots, 
  documents, 
  messages, 
  userChatbotAssignments,
  type User, 
  type InsertUser, 
  type Chatbot, 
  type InsertChatbot, 
  type Document, 
  type InsertDocument, 
  type Message, 
  type InsertMessage,
  type UserChatbotAssignment,
  type InsertUserChatbotAssignment
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and, inArray, like, gte, lte, desc, count } from "drizzle-orm";
import { pool } from "./db";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface with all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;

  // Chatbot assignments operations
  getAssignedChatbots(userId: number): Promise<Chatbot[]>;
  assignChatbotToUser(assignment: InsertUserChatbotAssignment): Promise<UserChatbotAssignment>;
  removeAssignment(userId: number, chatbotId: number): Promise<boolean>;
  getChatbotAssignments(chatbotId: number): Promise<UserChatbotAssignment[]>;

  // Chatbot operations
  getChatbots(userId: number): Promise<Chatbot[]>;
  getAllChatbots(): Promise<Chatbot[]>;
  getChatbot(id: number): Promise<Chatbot | undefined>;
  getChatbotBySlug(slug: string): Promise<Chatbot | undefined>;
  createChatbot(chatbot: InsertChatbot): Promise<Chatbot>;
  updateChatbot(id: number, chatbot: Partial<InsertChatbot>): Promise<Chatbot | undefined>;
  deleteChatbot(id: number): Promise<boolean>;
  incrementChatbotViews(id: number): Promise<void>;

  // Document operations
  getAllDocuments(userId: number): Promise<Document[]>;
  getDocumentsByChatbotId(chatbotId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;

  // Message operations
  getMessagesBySession(chatbotId: number, sessionId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: { content: string }): Promise<Message | undefined>;
  getChatLogs(filter: any, page: number, pageSize: number): Promise<{logs: Message[], totalCount: number}>;
  
  // Analytics operations
  getChatbotAnalytics(chatbotId: number, timeFilter?: any): Promise<{totalSessions: number, totalQueries: number}>;
  getOverallAnalytics(chatbotIds: number[], timeFilter?: any): Promise<{totalSessions: number, totalQueries: number}>;

  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: any;

  constructor() {
    try {
      // Create PostgreSQL session store with error handling
      const PgStore = connectPg(session);
      this.sessionStore = new PgStore({
        pool,
        tableName: 'sessions',
        createTableIfMissing: true,
        errorLog: (error: any) => {
          console.error('Session store error:', error);
        }
      });
    } catch (error) {
      console.error('Failed to initialize session store:', error);
      // Fallback to memory store if database fails
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      });
    }
  }
  
  // Analytics operations
  async getChatbotAnalytics(chatbotId: number, timeFilter?: any): Promise<{totalSessions: number, totalQueries: number}> {
    try {
      // Build queries with time filters if provided
      let queryConditions = and(eq(messages.chatbotId, chatbotId));
      
      if (timeFilter?.startDate) {
        queryConditions = and(queryConditions, gte(messages.timestamp, timeFilter.startDate));
      }
      
      if (timeFilter?.endDate) {
        queryConditions = and(queryConditions, lte(messages.timestamp, timeFilter.endDate));
      }
      
      // Count unique session IDs (for totalSessions)
      const allMessages = await db.select().from(messages).where(queryConditions);
      
      // Count unique sessions
      const uniqueSessions = new Set();
      allMessages.forEach(message => uniqueSessions.add(message.sessionId));
      
      // Count total queries (messages where isUser is true)
      const totalQueries = allMessages.filter(message => message.isUser).length;
      
      return {
        totalSessions: uniqueSessions.size,
        totalQueries: totalQueries
      };
    } catch (error) {
      console.error('Error getting chatbot analytics:', error);
      return { totalSessions: 0, totalQueries: 0 };
    }
  }
  
  async getOverallAnalytics(chatbotIds: number[], timeFilter?: any): Promise<{totalSessions: number, totalQueries: number}> {
    try {
      // Build queries with time filters if provided
      let queryConditions = inArray(messages.chatbotId, chatbotIds);
      
      if (timeFilter?.startDate) {
        queryConditions = and(queryConditions, gte(messages.timestamp, timeFilter.startDate));
      }
      
      if (timeFilter?.endDate) {
        queryConditions = and(queryConditions, lte(messages.timestamp, timeFilter.endDate));
      }
      
      // Get all messages for the chatbots
      const allMessages = await db.select().from(messages).where(queryConditions);
      
      // Count unique sessions
      const uniqueSessions = new Set();
      allMessages.forEach(message => uniqueSessions.add(`${message.chatbotId}:${message.sessionId}`));
      
      // Count total queries (messages where isUser is true)
      const totalQueries = allMessages.filter(message => message.isUser).length;
      
      return {
        totalSessions: uniqueSessions.size,
        totalQueries: totalQueries
      };
    } catch (error) {
      console.error('Error getting overall analytics:', error);
      return { totalSessions: 0, totalQueries: 0 };
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }
  
  // Chatbot assignments operations
  async getAssignedChatbots(userId: number): Promise<Chatbot[]> {
    const assignments = await db
      .select({
        chatbotId: userChatbotAssignments.chatbotId
      })
      .from(userChatbotAssignments)
      .where(eq(userChatbotAssignments.userId, userId));
    
    if (assignments.length === 0) {
      return [];
    }
    
    const chatbotIds = assignments.map(a => a.chatbotId);
    return await db
      .select()
      .from(chatbots)
      .where(inArray(chatbots.id, chatbotIds));
  }
  
  async assignChatbotToUser(assignment: InsertUserChatbotAssignment): Promise<UserChatbotAssignment> {
    // Check if assignment already exists
    const [existing] = await db
      .select()
      .from(userChatbotAssignments)
      .where(
        and(
          eq(userChatbotAssignments.userId, assignment.userId),
          eq(userChatbotAssignments.chatbotId, assignment.chatbotId)
        )
      );
    
    if (existing) {
      return existing;
    }
    
    // Create new assignment
    const [newAssignment] = await db
      .insert(userChatbotAssignments)
      .values(assignment)
      .returning();
    
    return newAssignment;
  }
  
  async removeAssignment(userId: number, chatbotId: number): Promise<boolean> {
    const result = await db
      .delete(userChatbotAssignments)
      .where(
        and(
          eq(userChatbotAssignments.userId, userId),
          eq(userChatbotAssignments.chatbotId, chatbotId)
        )
      );
    
    return result.rowCount > 0;
  }
  
  async getChatbotAssignments(chatbotId: number): Promise<UserChatbotAssignment[]> {
    return await db
      .select()
      .from(userChatbotAssignments)
      .where(eq(userChatbotAssignments.chatbotId, chatbotId));
  }

  // Chatbot operations
  async getChatbots(userId: number): Promise<Chatbot[]> {
    // Get user to check their role
    const user = await this.getUser(userId);
    
    if (user?.role === 'admin') {
      // Admins can see all chatbots
      return await db.select().from(chatbots).orderBy(desc(chatbots.createdAt));
    } else {
      // Non-admin users only see their own chatbots
      return await db.select().from(chatbots).where(eq(chatbots.userId, userId));
    }
  }

  async getAllChatbots(): Promise<Chatbot[]> {
    return await db.select().from(chatbots);
  }

  async getChatbot(id: number): Promise<Chatbot | undefined> {
    const [chatbot] = await db.select().from(chatbots).where(eq(chatbots.id, id));
    return chatbot;
  }

  async getChatbotBySlug(slug: string): Promise<Chatbot | undefined> {
    const [chatbot] = await db.select().from(chatbots).where(eq(chatbots.slug, slug));
    return chatbot;
  }

  async createChatbot(insertChatbot: InsertChatbot): Promise<Chatbot> {
    const now = new Date();
    const [chatbot] = await db.insert(chatbots).values({
      ...insertChatbot,
      views: 0,
      createdAt: now,
      updatedAt: now
    }).returning();
    return chatbot;
  }

  async updateChatbot(id: number, partialChatbot: Partial<InsertChatbot>): Promise<Chatbot | undefined> {
    const [updatedChatbot] = await db.update(chatbots)
      .set({
        ...partialChatbot,
        updatedAt: new Date()
      })
      .where(eq(chatbots.id, id))
      .returning();
    
    return updatedChatbot;
  }

  async deleteChatbot(id: number): Promise<boolean> {
    const deleted = await db.delete(chatbots).where(eq(chatbots.id, id)).returning();
    return deleted.length > 0;
  }

  async incrementChatbotViews(id: number): Promise<void> {
    const chatbot = await this.getChatbot(id);
    if (chatbot) {
      await db.update(chatbots)
        .set({ views: chatbot.views + 1 })
        .where(eq(chatbots.id, id));
    }
  }

  // Document operations
  async getAllDocuments(userId: number): Promise<Document[]> {
    // Get user to check their role
    const user = await this.getUser(userId);
    
    if (user?.role === 'admin') {
      // Admins can see all documents from all chatbots
      return await db.select().from(documents)
        .orderBy(desc(documents.createdAt));
    } else {
      // Non-admin users only see documents from their own chatbots
      const userChatbots = await this.getChatbots(userId);
      const chatbotIds = userChatbots.map(c => c.id);
      
      if (chatbotIds.length > 0) {
        return await db.select().from(documents)
          .where(inArray(documents.chatbotId, chatbotIds))
          .orderBy(desc(documents.createdAt));
      }
      return [];
    }
  }
  
  async getDocumentsByChatbotId(chatbotId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.chatbotId, chatbotId));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values({
      ...insertDocument,
      createdAt: new Date()
    }).returning();
    return document;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const deleted = await db.delete(documents).where(eq(documents.id, id)).returning();
    return deleted.length > 0;
  }

  // Message operations
  async getMessagesBySession(chatbotId: number, sessionId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(and(
        eq(messages.chatbotId, chatbotId),
        eq(messages.sessionId, sessionId)
      ))
      .orderBy(messages.timestamp);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values({
      ...insertMessage,
      timestamp: new Date()
    }).returning();
    return message;
  }

  async updateMessage(id: number, updates: { content: string }): Promise<Message | undefined> {
    const [message] = await db.update(messages)
      .set(updates)
      .where(eq(messages.id, id))
      .returning();
    return message;
  }
  
  async getChatLogs(filter: any, page: number, pageSize: number): Promise<{logs: Message[], totalCount: number}> {
    let query = db.select().from(messages);
    let countQuery = db.select({ count: count() }).from(messages);
    
    // Apply filters
    // Filter by specific chatbot
    if (filter.chatbotId) {
      query = query.where(eq(messages.chatbotId, filter.chatbotId));
      countQuery = countQuery.where(eq(messages.chatbotId, filter.chatbotId));
    } 
    // Filter by list of user's chatbots
    else if (filter.chatbotIds && filter.chatbotIds.length > 0) {
      query = query.where(inArray(messages.chatbotId, filter.chatbotIds));
      countQuery = countQuery.where(inArray(messages.chatbotId, filter.chatbotIds));
    }
    
    // Filter by text search
    if (filter.search) {
      query = query.where(like(messages.content, `%${filter.search}%`));
      countQuery = countQuery.where(like(messages.content, `%${filter.search}%`));
    }
    
    // Filter by date range
    if (filter.startDate) {
      query = query.where(gte(messages.timestamp, filter.startDate));
      countQuery = countQuery.where(gte(messages.timestamp, filter.startDate));
    }
    
    if (filter.endDate) {
      query = query.where(lte(messages.timestamp, filter.endDate));
      countQuery = countQuery.where(lte(messages.timestamp, filter.endDate));
    }
    
    // Get total count
    const [countResult] = await countQuery;
    const totalCount = Number(countResult?.count || 0);
    
    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.limit(pageSize).offset(offset);
    
    // Order by timestamp descending (newest first)
    query = query.orderBy(desc(messages.timestamp));
    
    // Execute query
    const logs = await query;
    
    return { logs, totalCount };
  }
}

export const storage = new DatabaseStorage();
