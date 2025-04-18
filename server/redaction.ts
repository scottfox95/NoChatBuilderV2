import nlp from 'compromise';
import natural from 'natural';
import { Message } from '@shared/schema';

// Initialize natural Tokenizer
const tokenizer = new natural.WordTokenizer();

/**
 * Redacts person names from the given text using Compromise NLP
 * @param text Text to redact names from
 * @returns Text with [REDACTED] replacing identified person names
 */
export function redactPersonNames(text: string): string {
  try {
    // Parse text with compromise
    const doc = nlp(text);
    
    // Get all person names
    const personNames = doc.people().out('array');
    
    // Replace all person names with [REDACTED]
    let redactedText = text;
    for (const name of personNames) {
      // Only redact if name is longer than 1 character to avoid false positives
      if (name && name.length > 1) {
        // Split full names into individual parts and redact each part
        const nameParts = name.split(/\s+/);
        for (const part of nameParts) {
          if (part.length > 1) {
            // Use a regex that accounts for word boundaries to avoid partial replacements
            const nameRegex = new RegExp(`\\b${part}\\b`, 'gi');
            redactedText = redactedText.replace(nameRegex, '[REDACTED]');
          }
        }
        
        // Also redact the full name
        const nameRegex = new RegExp(`\\b${name}\\b`, 'gi');
        redactedText = redactedText.replace(nameRegex, '[REDACTED]');
      }
    }
    
    // Additional redaction for first names in common intro patterns
    const nameIntroPatterns = [
      /\bmy name is (\w+)\b/gi,
      /\bI am (\w+)\b/gi,
      /\bI'm (\w+)\b/gi,
      /\bcall me (\w+)\b/gi,
      /\bthis is (\w+)\b/gi
    ];
    
    for (const pattern of nameIntroPatterns) {
      redactedText = redactedText.replace(pattern, (match, nameGroup) => {
        return match.replace(nameGroup, '[REDACTED]');
      });
    }
    
    return redactedText;
  } catch (error) {
    console.error('Error during name redaction:', error);
    return text; // Return original text if an error occurs
  }
}

/**
 * Redacts common PII data types from text:
 * - Person names (using NLP)
 * - Email addresses
 * - Phone numbers
 * - Social Security Numbers (US format)
 * - Dates (common formats)
 * 
 * @param text Text to redact PII from
 * @returns Text with PII replaced by [REDACTED]
 */
export function redactPII(text: string): string {
  if (!text) return text;
  
  try {
    // First redact person names using NLP
    let redactedText = redactPersonNames(text);
    
    // Redact email addresses
    redactedText = redactedText.replace(
      /[\w\.-]+@[\w\.-]+\.\w+/gi,
      '[REDACTED]'
    );
    
    // Redact phone numbers (various formats)
    redactedText = redactedText.replace(
      /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
      '[REDACTED]'
    );
    
    // Redact SSNs (US format)
    redactedText = redactedText.replace(
      /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
      '[REDACTED]'
    );
    
    // Redact dates (common formats)
    redactedText = redactedText.replace(
      /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
      '[REDACTED]'
    );
    
    // Additional context-based redaction for common patterns that might be missed by NLP
    // These are designed to catch first names in introductions, signatures, etc.
    
    // Pattern: "I am <name>" variations
    redactedText = redactedText.replace(/\b(I am|I'm|Im|i am|i'm) (\w+)(?=[\s,.!?]|$)/gi, 
      (match, prefix, name) => `${prefix} [REDACTED]`);
    
    // Pattern: "name is <name>" variations
    redactedText = redactedText.replace(/\b(name is|name's) (\w+)(?=[\s,.!?]|$)/gi, 
      (match, prefix, name) => `${prefix} [REDACTED]`);
    
    // Pattern: "call me <name>" variations
    redactedText = redactedText.replace(/\b(call me|I go by) (\w+)(?=[\s,.!?]|$)/gi, 
      (match, prefix, name) => `${prefix} [REDACTED]`);
      
    // Pattern: "this is <name>" or "from <name>" variations
    redactedText = redactedText.replace(/\b(this is|from) (\w+)(?=[\s,.!?]|$)/gi, 
      (match, prefix, name) => `${prefix} [REDACTED]`);
      
    // Pattern: "regards, <name>" or "sincerely, <name>" 
    redactedText = redactedText.replace(/\b(regards,|sincerely,|thanks,|cheers,) (\w+)(?=[\s,.!?]|$)/gi, 
      (match, prefix, name) => `${prefix} [REDACTED]`);
    
    return redactedText;
  } catch (error) {
    console.error('Error during PII redaction:', error);
    return text; // Return original text if an error occurs
  }
}

/**
 * Redacts PII from a chat message object
 * @param message Message object to redact
 * @returns New message object with redacted content
 */
export function redactMessagePII(message: Message): Message {
  // Only redact content of user messages, not bot responses
  if (message.isUser) {
    return {
      ...message,
      content: redactPII(message.content)
    };
  }
  return message;
}

/**
 * Redacts PII from an array of message objects
 * @param messages Array of message objects to redact
 * @returns New array with redacted message contents
 * @note Only user messages are redacted, not bot responses
 */
export function redactMessagesPII(messages: Message[]): Message[] {
  return messages.map(message => redactMessagePII(message));
}