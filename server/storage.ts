import { users, type User, type InsertUser, type Chatbot, type InsertChatbot, type Document, type InsertDocument, type Message, type InsertMessage } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface with all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Chatbot operations
  getChatbots(userId: number): Promise<Chatbot[]>;
  getChatbot(id: number): Promise<Chatbot | undefined>;
  getChatbotBySlug(slug: string): Promise<Chatbot | undefined>;
  createChatbot(chatbot: InsertChatbot): Promise<Chatbot>;
  updateChatbot(id: number, chatbot: Partial<InsertChatbot>): Promise<Chatbot | undefined>;
  deleteChatbot(id: number): Promise<boolean>;
  incrementChatbotViews(id: number): Promise<void>;

  // Document operations
  getDocumentsByChatbotId(chatbotId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;

  // Message operations
  getMessagesBySession(chatbotId: number, sessionId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chatbots: Map<number, Chatbot>;
  private documents: Map<number, Document>;
  private messages: Map<number, Message>;
  private userIdCounter: number;
  private chatbotIdCounter: number;
  private documentIdCounter: number;
  private messageIdCounter: number;
  readonly sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.chatbots = new Map();
    this.documents = new Map();
    this.messages = new Map();
    this.userIdCounter = 1;
    this.chatbotIdCounter = 1;
    this.documentIdCounter = 1;
    this.messageIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Chatbot operations
  async getChatbots(userId: number): Promise<Chatbot[]> {
    return Array.from(this.chatbots.values()).filter(
      (chatbot) => chatbot.userId === userId,
    );
  }

  async getChatbot(id: number): Promise<Chatbot | undefined> {
    return this.chatbots.get(id);
  }

  async getChatbotBySlug(slug: string): Promise<Chatbot | undefined> {
    return Array.from(this.chatbots.values()).find(
      (chatbot) => chatbot.slug === slug,
    );
  }

  async createChatbot(insertChatbot: InsertChatbot): Promise<Chatbot> {
    const id = this.chatbotIdCounter++;
    const now = new Date();
    const chatbot: Chatbot = {
      ...insertChatbot,
      id,
      views: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.chatbots.set(id, chatbot);
    return chatbot;
  }

  async updateChatbot(id: number, partialChatbot: Partial<InsertChatbot>): Promise<Chatbot | undefined> {
    const chatbot = this.chatbots.get(id);
    if (!chatbot) return undefined;

    const updatedChatbot: Chatbot = {
      ...chatbot,
      ...partialChatbot,
      updatedAt: new Date(),
    };

    this.chatbots.set(id, updatedChatbot);
    return updatedChatbot;
  }

  async deleteChatbot(id: number): Promise<boolean> {
    return this.chatbots.delete(id);
  }

  async incrementChatbotViews(id: number): Promise<void> {
    const chatbot = this.chatbots.get(id);
    if (chatbot) {
      chatbot.views++;
      this.chatbots.set(id, chatbot);
    }
  }

  // Document operations
  async getDocumentsByChatbotId(chatbotId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => document.chatbotId === chatbotId,
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const document: Document = {
      ...insertDocument,
      id,
      createdAt: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Message operations
  async getMessagesBySession(chatbotId: number, sessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(
        (message) => message.chatbotId === chatbotId && message.sessionId === sessionId,
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }
}

export const storage = new MemStorage();
