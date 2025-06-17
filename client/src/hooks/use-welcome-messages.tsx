import { useState, useEffect } from 'react';

const DEFAULT_WELCOME_MESSAGES = [
  "Hello! How can I assist you today?",
  "Welcome! I'm here to help you with any questions you may have.",
  "Hi there! What can I help you with today?",
  "Greetings! I'm your AI assistant. How may I be of service?",
  "Welcome! Feel free to ask me anything.",
  "Hello! I'm here to provide you with information and support.",
  "Hi! What would you like to know today?",
  "Welcome! I'm ready to help with your questions.",
  "Hello! How may I assist you this morning?",
  "Hi there! I'm your virtual assistant. What can I do for you?",
  "Welcome to our support! How can I help?",
  "Hello! I'm here to make your experience easier. What do you need?",
  "Hi! Ready to help with whatever you need today.",
  "Welcome! Ask me anything and I'll do my best to help.",
  "Hello! Your AI assistant is here and ready to help.",
];

const STORAGE_KEY = 'customWelcomeMessages';

export function useWelcomeMessages() {
  const [customMessages, setCustomMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load custom messages from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomMessages(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading custom welcome messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save custom messages to localStorage
  const saveCustomMessages = (messages: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      setCustomMessages(messages);
    } catch (error) {
      console.error('Error saving custom welcome messages:', error);
    }
  };

  // Add a new custom message
  const addCustomMessage = (message: string) => {
    if (!message.trim()) return;
    const trimmed = message.trim();
    if (!customMessages.includes(trimmed)) {
      const updated = [...customMessages, trimmed];
      saveCustomMessages(updated);
    }
  };

  // Remove a custom message
  const removeCustomMessage = (message: string) => {
    const updated = customMessages.filter(msg => msg !== message);
    saveCustomMessages(updated);
  };

  // Get all available messages (default + custom)
  const getAllMessages = () => {
    return [...DEFAULT_WELCOME_MESSAGES, ...customMessages];
  };

  // Reset to defaults
  const resetToDefaults = () => {
    saveCustomMessages([]);
  };

  return {
    customMessages,
    defaultMessages: DEFAULT_WELCOME_MESSAGES,
    allMessages: getAllMessages(),
    isLoading,
    addCustomMessage,
    removeCustomMessage,
    saveCustomMessages,
    resetToDefaults,
  };
}