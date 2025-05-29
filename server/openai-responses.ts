import { openai } from "./client";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Simple responses API implementation for non-streaming
export async function generateResponseCompletion({
  userMessage,
  chatbot,
  fallbackResponse = "I couldn't generate a response.",
}: {
  userMessage: string;
  chatbot?: { vectorStoreId?: string };
  fallbackResponse?: string;
}): Promise<string> {
  try {
    console.log("Making responses API call with:", { 
      model: "gpt-4o-mini", 
      input: userMessage,
      hasVectorStore: !!chatbot?.vectorStoreId 
    });
    
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: userMessage,
      ...(chatbot?.vectorStoreId && {
        tools: [{
          type: "file_search",
          vector_store_ids: [chatbot.vectorStoreId],
        }]
      }),
    });

    console.log("Responses API response:", JSON.stringify(response, null, 2));
    return (response as any).output_text || fallbackResponse;
  } catch (error) {
    console.error("OpenAI responses completion error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return fallbackResponse;
  }
}

// Streaming responses API implementation
export async function generateStreamingResponseCompletion({
  userMessage,
  chatbot,
  onChunk,
  onComplete,
  onError,
  fallbackResponse = "I couldn't generate a response.",
}: {
  userMessage: string;
  chatbot?: { vectorStoreId?: string };
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: any) => void;
  fallbackResponse?: string;
}): Promise<void> {
  console.log("=== RESPONSES API CALLED ===");
  console.log("User message:", userMessage);
  console.log("Has vector store:", !!chatbot?.vectorStoreId);
  
  try {
    const stream = await openai.responses.create({
      model: "gpt-4o-mini",
      input: userMessage,
      ...(chatbot?.vectorStoreId && {
        tools: [{
          type: "file_search",
          vector_store_ids: [chatbot.vectorStoreId],
        }]
      }),
      stream: true,
    });

    let fullResponse = "";
    
    for await (const chunk of stream as any) {
      // Handle streaming chunks from responses API
      if (chunk.type === 'response.output_text.delta' && chunk.delta) {
        const content = chunk.delta;
        fullResponse += content;
        onChunk(content);
      }
    }

    if (fullResponse.trim() === "") {
      fullResponse = fallbackResponse;
      onChunk(fallbackResponse);
    }

    onComplete(fullResponse);
  } catch (error) {
    console.error("OpenAI streaming responses completion error:", error);
    onError(fallbackResponse);
  }
}