import { config } from 'dotenv';
import { db } from '../server/db';
import { openaiModels } from '../shared/schema';
import { openai } from '../server/client';

// Load environment variables
config();

// Step 0: alias map (expandable)
const ALIAS: Record<string, string> = {
  'chatgpt-4o-latest': 'gpt-4o',
  // add future aliases here, e.g. 'gpt-4o-latest': 'gpt-4o'
};

async function updateModels() {
  try {
    console.log('Fetching models from OpenAI...');
    
    const list = await openai.models.list();
    
    // Deduplicate using a Map keyed by canonical ID
    const modelMap = new Map<string, any>();

    list.data
      .filter(m => 
        !m.id.startsWith('ft-') && 
        (m.id.includes('gpt') || m.id.includes('chat')) &&
        !m.id.includes('instruct') // Exclude instruct models as they're not chat models
      )
      .forEach(m => {
        const canonical = ALIAS[m.id] ?? m.id;
        // keep first-seen row (usually canonical) and ignore alias duplicates
        if (!modelMap.has(canonical)) {
          modelMap.set(canonical, {
            id: canonical,
            created: m.created ?? 0,
            ownedBy: (m as any).owned_by ?? 'openai',
            object: m.object,
            isChat: true,
            updatedAt: new Date(),
          });
        }
      });

    const chatModels = Array.from(modelMap.values());

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