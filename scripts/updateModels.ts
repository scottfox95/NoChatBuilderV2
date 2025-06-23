import { config } from 'dotenv';
import { db } from '../server/db';
import { openaiModels } from '../shared/schema';
import { openai } from '../server/client';

// Load environment variables
config();

async function updateModels() {
  try {
    console.log('Fetching models from OpenAI...');
    
    const list = await openai.models.list();
    
    // Filter to chat-capable, non-fine-tuned models only
    const chatModels = list.data
      .filter(m => 
        !m.id.startsWith('ft-') && 
        (m.id.includes('gpt') || m.id.includes('chat')) &&
        !m.id.includes('instruct') // Exclude instruct models as they're not chat models
      )
      .map(m => ({
        id: m.id,
        created: m.created ?? 0,
        ownedBy: (m as any).owned_by ?? 'openai',
        object: m.object,
        isChat: true,
        updatedAt: new Date(),
      }));

    console.log(`Found ${chatModels.length} chat-capable models`);
    
    // Upsert models into database
    for (const model of chatModels) {
      await db.insert(openaiModels)
        .values(model)
        .onConflictDoUpdate({
          target: openaiModels.id,
          set: {
            created: model.created,
            ownedBy: model.ownedBy,
            object: model.object,
            isChat: model.isChat,
            updatedAt: model.updatedAt,
          }
        });
    }

    console.log(`Successfully upserted ${chatModels.length} models to database`);
    
    // Log model IDs for verification
    console.log('Models updated:', chatModels.map(m => m.id).sort().join(', '));
    
  } catch (error) {
    console.error('Error updating models:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

updateModels();