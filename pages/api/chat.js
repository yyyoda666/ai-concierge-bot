import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple conversation memory (in production, use Redis)
const conversations = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationId } = req.body;

    // Get or create conversation history
    const conversationKey = conversationId || 'default';
    let history = conversations.get(conversationKey) || [];

    // Add user message to history
    history.push({ role: 'user', content: message });

    // Basic system prompt (we'll expand this later)
    const systemPrompt = `You are a helpful assistant representing Intelligence Matters, a creative AI agency. 
    Keep responses conversational and helpful. Try to understand what the user needs.`;

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: systemPrompt,
      messages: history
    });

    const botResponse = response.content[0].text;

    // Add bot response to history
    history.push({ role: 'assistant', content: botResponse });

    // Store updated history
    conversations.set(conversationKey, history);

    // Log conversation data (our "dump" system for now)
    const logData = {
      timestamp: new Date().toISOString(),
      conversationId: conversationKey,
      userMessage: message,
      botResponse: botResponse,
      fullHistory: history
    };

    // Write to file (simple dump)
    const logPath = path.join(process.cwd(), 'conversation-logs.json');
    let logs = [];
    if (fs.existsSync(logPath)) {
      const existingLogs = fs.readFileSync(logPath, 'utf8');
      logs = JSON.parse(existingLogs);
    }
    logs.push(logData);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));

    console.log('CONVERSATION LOG:', logData);

    res.status(200).json({
      response: botResponse,
      conversationId: conversationKey
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}