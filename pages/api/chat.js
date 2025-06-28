import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple conversation memory (in production, use Redis)
const conversations = new Map();

// Load conversations from file on startup (development backup)
const loadConversationsFromFile = () => {
  try {
    const convPath = path.join(process.cwd(), 'conversation-memory.json');
    if (fs.existsSync(convPath)) {
      const data = JSON.parse(fs.readFileSync(convPath, 'utf8'));
      Object.entries(data).forEach(([key, value]) => {
        conversations.set(key, value);
      });
      console.log('Loaded', Object.keys(data).length, 'conversations from backup');
    }
  } catch (error) {
    console.log('No conversation backup found (this is normal on first run)');
  }
};

// Save conversations to file (development backup)
const saveConversationsToFile = () => {
  try {
    const convPath = path.join(process.cwd(), 'conversation-memory.json');
    const data = Object.fromEntries(conversations);
    fs.writeFileSync(convPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Failed to backup conversations:', error.message);
  }
};

// Load personality from external file
let maitredPersonality = '';
const loadPersonality = () => {
  try {
    const personalityPath = path.join(process.cwd(), 'personality', 'maitre-d-persona.md');
    if (fs.existsSync(personalityPath)) {
      maitredPersonality = fs.readFileSync(personalityPath, 'utf8');
      console.log('Loaded maître d\' personality from external file');
    } else {
      console.log('Personality file not found, using default');
    }
  } catch (error) {
    console.log('Failed to load personality file:', error.message);
  }
};

// Load on startup
loadConversationsFromFile();
loadPersonality();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationId } = req.body;

    // Get or create conversation history
    const conversationKey = conversationId || 'default';
    let history = conversations.get(conversationKey) || [];

    // Debug logging for conversation memory
    console.log('CONVERSATION MEMORY DEBUG:', {
      conversationId: conversationKey,
      existingHistoryLength: history.length,
      incomingMessage: message.substring(0, 50) + '...'
    });

    // Add user message to history
    history.push({ role: 'user', content: message });

    // Sophisticated maître d' system prompt - Anna Wintour level refinement
    const systemPrompt = `You are the maître d' for Intelligence Matters, embodying the sophistication of someone who could intellectually joust with Anna Wintour. You serve Creative Directors and Artists of luxury fashion houses.

RESPONSE RULES:
- Maximum 2-3 sentences per response
- Maximum 1 question per response  
- Sophisticated restraint - every word chosen with purpose
- Never verbose or overwhelming

FILE HANDLING - CRITICAL:
- NEVER pretend to see image contents
- When files uploaded: "I see you've shared an image. Could you describe what this represents in your project?"
- Always ask for clarification rather than guessing

CONVERSATION FLOW:
1. Sophisticated greeting
2. One focused question about project type
3. Natural contact collection when serious intent shown
4. Build brief through precise, elegant questions

TONE: French Michelin-starred maître d' serving high-fashion creative directors. Cultured precision, subtle authority, creative intelligence.`;

    // Extract context from conversation history for better memory
    const hasName = history.some(msg => 
      msg.role === 'user' && (
        msg.content.toLowerCase().includes('my name is') ||
        msg.content.toLowerCase().includes('i\'m ') ||
        /^[A-Z][a-z]+( [A-Z][a-z]+)*$/.test(msg.content.trim())
      )
    );
    const hasEmail = history.some(msg => 
      msg.role === 'user' && msg.content.includes('@')
    );
    const projectType = history.find(msg => 
      msg.content.toLowerCase().includes('ecom') ||
      msg.content.toLowerCase().includes('photography') ||
      msg.content.toLowerCase().includes('shoot') ||
      msg.content.toLowerCase().includes('concept') ||
      msg.content.toLowerCase().includes('brand')
    );

    // Add context awareness to system prompt  
    const contextAwarePrompt = systemPrompt + `

CONTEXT: ${hasName ? 'Name provided' : 'Name needed'}, ${hasEmail ? 'Email provided' : 'Email needed'}, ${history.length} messages
${hasName ? 'CRITICAL: Use their name when responding.' : ''}`;

    // Call Claude with the sophisticated personality
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: contextAwarePrompt,
      messages: history
    });

    const botResponse = response.content[0].text;

    // Add bot response to history
    history.push({ role: 'assistant', content: botResponse });

    // Store updated history
    conversations.set(conversationKey, history);
    
    // Backup to file in development
    if (process.env.NODE_ENV === 'development') {
      saveConversationsToFile();
    }

    // Enhanced logging with conversation analysis
    const logData = {
      timestamp: new Date().toISOString(),
      conversationId: conversationKey,
      userMessage: message,
      botResponse: botResponse,
      conversationLength: history.length,
      lastUserLanguage: detectLanguage(message),
      fullHistory: history
    };

    // Write to file (simple dump) - only in development
    if (process.env.NODE_ENV === 'development') {
      try {
        const logPath = path.join(process.cwd(), 'conversation-logs.json');
        let logs = [];
        if (fs.existsSync(logPath)) {
          const existingLogs = fs.readFileSync(logPath, 'utf8');
          logs = JSON.parse(existingLogs);
        }
        logs.push(logData);
        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
      } catch (error) {
        console.log('File logging failed (expected in production):', error.message);
      }
    }

    console.log('MAÎTRE D\' CONVERSATION LOG:', {
      conversationId: conversationKey,
      messageLength: message.length,
      responseLength: botResponse.length,
      totalMessages: history.length
    });

    res.status(200).json({
      response: botResponse,
      conversationId: conversationKey,
      metadata: {
        conversationLength: history.length,
        language: detectLanguage(message)
      }
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Simple language detection helper
function detectLanguage(text) {
  const swedishWords = ['och', 'att', 'det', 'är', 'jag', 'på', 'en', 'av', 'för', 'till', 'med', 'har', 'som', 'inte', 'kan', 'vi', 'om', 'var', 'så', 'blir'];
  const words = text.toLowerCase().split(/\s+/);
  const swedishCount = words.filter(word => swedishWords.includes(word)).length;
  return swedishCount > words.length * 0.1 ? 'sv' : 'en'; // If >10% Swedish words, assume Swedish
}