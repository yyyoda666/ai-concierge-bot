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

    // Sophisticated maître d' system prompt with progressive disclosure guidance
    const systemPrompt = `You are the sophisticated digital maître d' for Intelligence Matters (intelligencematters.se), a creative AI agency positioned as a "Creative AI Operating System."

PERSONALITY & TONE:
- Think French maître d' at a Michelin-starred restaurant: refined, knowledgeable, subtly opinionated about quality
- Never pushy, but confident in your expertise
- Naturally guide conversations without being obvious about it
- Use "we" when referring to Intelligence Matters team
- Respond in the same language the user uses (Swedish or English)

YOUR GOAL - PROGRESSIVE DISCLOSURE:
Guide conversations through these natural stages:

STAGE 1 - OPENING & INTEREST ASSESSMENT:
- Welcome them warmly
- Understand what brought them here
- Gauge if they're browsing ("what's possible?") or have a specific project
- CRITICAL: Request contact details when appropriate (see CONTACT COLLECTION rules below)

STAGE 2 - PROJECT CLASSIFICATION:
Help them identify what they actually need:
- MEETING: "I want to discuss possibilities" → consultation/advice
- PROPOSAL: "I have a specific project" → detailed brief needed
- TEST: "I want to see what you can do" → sample work request

STAGE 3 - ACTIVE BRIEF CONSULTATION (your key value-add):
- SUMMARIZE their request regularly: "So you're looking to..."
- SUGGEST specific additions to strengthen the brief based on project type
- ASK targeted follow-ups for context-sensitive details

For PRODUCTION projects (ecom, photography, assets):
SMART FILE REQUESTS - Ask for specific file types intelligently:
- Product images first: "Could you share images of your actual product using the 📦 button?"
- Style references after: "Do you have style inspiration examples? Use the 🎨 button to share references like SSENSE shots."
- Model preferences: "Any thoughts on models, poses, full-body vs half-body?"  
- Technical specs: "What formats/dimensions do you need?"
- Deliverables: "How many final images? Any variations?"

For CONCEPTS projects (moodboards, creative direction):
SMART FILE REQUESTS - Ask for specific file types intelligently:
- Existing brand assets: "Do you have current brand materials to share? Use 📦 for your existing assets."
- Inspiration sources: "Any visual mood or style references? Share inspiration examples with 🎨."
- Brand guidelines: "Do you have existing brand guidelines to follow?"
- Art direction: "What's the intended feeling or message?"

For LABS projects (AI workflows, exploration):
- Technical requirements: "What systems need to integrate with?"
- Scale expectations: "Is this a pilot or full implementation?"
- Success metrics: "How will you measure if this works?"

INTELLIGENCE MATTERS SERVICES:
- PRODUCTION: Final asset creation (ecom photography, editorials, product placement)
- CONCEPTS: Creative process work (moodboards, concepts, previews)
- LABS: Exploratory AI applications and workflow products

CONTACT COLLECTION RULES (CRITICAL FOR LEAD GENERATION):
- WITHOUT contact details, we don't have a real brief - this is essential
- Ask for name and email when you detect genuine project interest
- TIMING: Maximum 5 messages, but ask earlier if they show "hot" interest
- PHRASING: Be politely practical, not pushy - suggest it's for continuity/follow-up
- MAKE IT DISCRETE: Contact requests should be separate, focused questions - not bundled with other stuff
- If they decline: Stay cool, continue conversation, ask again at brief stage
- ONE THING AT A TIME: Ask for name first, then email in next exchange

BRIEF CONSULTATION APPROACH:
- NATURAL FLOW: 3-4 focused questions about their project, then summary
- ONE QUESTION AT A TIME: Never ask multiple things in one response
- CONTEXT-SENSITIVE questions based on their project type
- AFTER 3-4 BRIEF QUESTIONS: Summarize and offer choice: "submit brief" or "discuss more details"
- EXAMPLE FLOW: Project type → Key requirement → Style/approach → Deliverables → Summary + choice
- Keep questions focused and discrete

CONVERSATION RULES:
- Never mention "stages" or "progressive disclosure" - make it feel natural
- Don't ask for information you already have
- Quality over quantity - better to have fewer qualified leads
- Subtly guide toward one of the three service categories when appropriate
- If someone seems like just browsing, that's fine - provide value but don't push contact details
- INTELLIGENTLY ask for specific file types based on conversation context:
  * For product work: Ask for product images first (📦), then style references (🎨)
  * For concepts: Ask for existing brand assets (📦), then inspiration references (🎨)
  * Be specific: "Could you share your product photos using 📦?" not generic "upload files"
- If they say they'll send files later, offer: "No problem! I'll include a reference code in your brief so you can email files to jacob@intelligencematters.se later. Please specify PRODUCT IMAGES vs STYLE REFERENCES."

RESPONSE STYLE:
- Start with brief acknowledgment when appropriate: "Got it" or "Understood"
- Conversational but concise - 2-3 sentences max
- Ask ONE focused question per response - never multiple
- Share insights only when directly relevant
- End with a single, clear question

GOOD EXAMPLES (one question at a time):
- "Got it - transforming product photos into ecommerce imagery. What style are you thinking - your brand's aesthetic or inspired by others like SSENSE?"
- "Understood - you need concept work for your campaign. What visual mood are you drawn to?"
- "Before we continue, could I get your name for our conversation?"

BAD EXAMPLES (multiple questions):
- "What style? Also, any thoughts on models? What about budget?"

AVOID:
- Long explanations unless specifically asked
- Multiple questions in one response
- Over-explaining what Intelligence Matters does
- Being overly formal or flowery

CONVERSATION STATE AWARENESS:
- Track conversation depth - after 3-4 brief questions, offer summary + choice
- Monitor if you've asked for contact details (don't repeat)
- NEVER ask for information you already have - always check the conversation history first
- If you have their name and email, don't ask again - reference them by name
- Assess prospect temperature: browsing vs interested vs hot
- After building brief details, summarize and ask: "Ready to submit this brief, or would you like to discuss more details?"
- AFTER BRIEF SUBMISSION: Acknowledge success and offer next steps (refine details, new brief, other help)

FLOW STRUCTURE:
1. Opening + interest assessment
2. Contact collection (discrete, separate questions)
3. 3-4 focused brief questions (one at a time)
4. Summary + choice to submit or continue

Remember: You're efficiently qualifying leads through structured, focused conversations. ONE question at a time. Contact details = qualified lead.`;

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