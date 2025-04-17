import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface CompletionOptions {
  model: string;
  systemPrompt: string;
  userMessage: string;
  previousMessages: Message[];
  temperature: number;
  maxTokens: number;
  documents: string[];
  fallbackResponse?: string;
}

export async function generateCompletion({
  model,
  systemPrompt,
  userMessage,
  previousMessages,
  temperature,
  maxTokens,
  documents,
  fallbackResponse,
}: CompletionOptions): Promise<string> {
  try {
    // Create a modified system prompt that includes documents if RAG is enabled
    let enhancedSystemPrompt = systemPrompt;
    
    if (documents && documents.length > 0) {
      // Combine all document text but limit by token count (rough approximation)
      const combinedDocs = documents.join("\n\n");
      const contextLimit = 4000; // Rough limit to avoid token limits
      const truncatedDocs = combinedDocs.length > contextLimit
        ? combinedDocs.substring(0, contextLimit) + "..."
        : combinedDocs;
      
      enhancedSystemPrompt += `\n\nHere is additional context to help answer the user's questions:\n${truncatedDocs}`;
    }

    // Prepare messages for OpenAI
    const messages: Message[] = [
      { role: "system", content: enhancedSystemPrompt },
      ...previousMessages,
      { role: "user", content: userMessage },
    ];

    // Map internal model names to actual OpenAI model IDs
    const modelMap: Record<string, string> = {
      "gpt4-1": "gpt-4o",
      "gpt4": "gpt-4",
      "gpt35turbo": "gpt-3.5-turbo",
      "nano": "gpt-3.5-turbo-16k",
    };

    const actualModel = modelMap[model] || "gpt-3.5-turbo";

    const response = await openai.chat.completions.create({
      model: actualModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0].message.content || fallbackResponse || "I couldn't generate a response.";
  } catch (error) {
    console.error("OpenAI completion error:", error);
    return fallbackResponse || "I'm sorry, I couldn't process your request at this time.";
  }
}

export async function processDocumentText(text: string, fileType: string): Promise<string> {
  // In a real implementation, we would process PDFs, DOCXs, etc. differently
  // For simplicity, we're just returning the text directly
  
  // For PDF and DOCX processing, you would use:
  // - PDF.js for PDFs
  // - Mammoth.js for DOCX files
  
  return text;
}
