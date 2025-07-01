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
let companyContext = '';

const loadPersonality = () => {
  try {
    const personalityPath = path.join(process.cwd(), 'personality', 'maitre-d-persona.md');
    if (fs.existsSync(personalityPath)) {
      maitredPersonality = fs.readFileSync(personalityPath, 'utf8');
      console.log('Loaded personality from external file');
    } else {
      console.log('Personality file not found, using default');
    }
  } catch (error) {
    console.log('Failed to load personality file:', error.message);
  }
};

const loadCompanyContext = () => {
  try {
    const contextPath = path.join(process.cwd(), 'company-context.md');
    if (fs.existsSync(contextPath)) {
      companyContext = fs.readFileSync(contextPath, 'utf8');
      console.log('Loaded company context from external file');
    } else {
      console.log('Company context file not found');
    }
  } catch (error) {
    console.log('Failed to load company context:', error.message);
  }
};

// Load on startup
loadConversationsFromFile();
loadPersonality();
loadCompanyContext();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationId, fileInfo } = req.body;

    // Get or create conversation history
    const conversationKey = conversationId || 'default';
    let history = conversations.get(conversationKey) || [];

    // Handle image analysis if fileInfo is provided
    let enhancedMessage = message;
    if (fileInfo && fileInfo.url && fileInfo.mimetype?.startsWith('image/')) {
      try {
        // Call Claude with vision capabilities for image analysis
        const imageAnalysisResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this image and describe what you see. Focus on the style, composition, subject matter, and any relevant details for a creative/fashion context. Keep it concise but informative.'
              },
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: fileInfo.url
                }
              }
            ]
          }]
        });

        const imageDescription = imageAnalysisResponse.content[0].text;
        
        // Enhance the user message with image analysis, including context if provided
        const contextInfo = message ? `User context: "${message}"` : 'No context provided';
        enhancedMessage = `User uploaded image: ${fileInfo.originalName}
${contextInfo}
[Image Analysis: ${imageDescription}]`;
        
      } catch (imageError) {
        console.error('Image analysis failed:', imageError);
        // Fall back to original behavior if image analysis fails
        enhancedMessage = message || `User uploaded an image: ${fileInfo.originalName}`;
      }
    }

    // Add user message to history
    history.push({ role: 'user', content: enhancedMessage });

    // Load personality prompt from external file
    const systemPrompt = `${maitredPersonality}

COMPANY CONTEXT:
${companyContext}

TECHNICAL INSTRUCTIONS:
- When you determine a conversation is ready for submission based on your personality guidelines, include READY_TO_SUBMIT on its own line
- For image analysis, you will receive [Image Analysis: ...] content to inform your responses
- Maintain your sophisticated persona while being helpful and efficient

Use the company context to provide informed responses about services, capabilities, and approach.`;

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

    // Development logging only
    if (process.env.NODE_ENV === 'development') {
      const logData = {
        timestamp: new Date().toISOString(),
        conversationId: conversationKey,
        userMessage: message,
        botResponse: botResponse,
        conversationLength: history.length,
        lastUserLanguage: detectLanguage(message),
        fullHistory: history
      };

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
        // Silent fail for logging
      }
    }

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