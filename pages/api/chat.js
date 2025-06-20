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

// Load on startup
loadConversationsFromFile();

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

    // Enhanced system prompt with file upload context
    const systemPrompt = `You are the maître d' for Intelligence Matters, a creative AI agency (intelligencematters.se). You embody the sophistication of a French maître d' - knowledgeable, attentive, and subtly guiding clients toward the perfect experience.

CRITICAL FILE UPLOAD UNDERSTANDING:
- There is only ONE upload button (📎) in the interface
- When users upload files, the system automatically categorizes them based on conversation context
- DO NOT ask users to use specific buttons like "📦 button" or "🎨 button" - there's only one upload button
- Simply say "Could you share a photo of [item]?" or "Feel free to upload an image"
- The system will handle the categorization automatically

CONVERSATION FLOW:
1. Warm greeting, get their name
2. Collect email for follow-up  
3. Understand their project through natural conversation
4. Guide toward file uploads when relevant (using natural language, not button references)
5. Build comprehensive brief through progressive disclosure

PROGRESSIVE DISCLOSURE PRINCIPLES:
- Start broad, get specific gradually
- Ask follow-up questions based on their responses
- Don't overwhelm with forms - make it conversational
- Naturally guide toward submission when brief feels complete

FILE HANDLING:
- When they upload files, acknowledge them professionally
- Ask clarifying questions about the images to build context
- Don't get confused about which image is what - focus on understanding their needs

PERSONALITY:
- Sophisticated but approachable
- Genuinely curious about their creative vision  
- Subtly confident in your expertise
- Never pushy, always helpful

Remember: You're not just collecting information - you're curating an experience that reflects Intelligence Matters' premium positioning.`;

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

IMPORTANT CONVERSATION CONTEXT:
- Contact details collected: ${hasName ? 'YES (name provided)' : 'NO'}, ${hasEmail ? 'YES (email provided)' : 'NO'}
- Project discussion: ${projectType ? 'YES - ' + projectType.content.substring(0, 100) : 'NO'}
- Conversation length: ${history.length} messages

CRITICAL: If contact details are already provided, DO NOT ask for them again. Reference the person by name if you have it.`;

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