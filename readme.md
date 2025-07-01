# AI Chat Interface

A sophisticated AI-powered lead generation system that replaces traditional contact forms with an intelligent conversational experience. Built for creative agencies and service providers.

## What This Does

Transforms website visitors into qualified prospects through natural conversation with a sophisticated AI personality refined enough to serve high-end creative professionals. Think luxury service-level refinement applied to creative project consultation.

## Key Features

### 🎭 **Sophisticated AI Personality**
- **High-end sophistication** - Refined enough for luxury Creative Directors
- **External personality configuration** - Safe editing without touching code
- **Cultured precision** - Maximum 2-3 sentences, 1 question per response
- **Intelligent image analysis** - AI can actually "see" and describe uploaded images

### 📁 **Intelligent File Processing** 
- **Smart file categorization** - AI automatically categorizes uploads as "product" vs "reference" images
- **Rich file metadata** - Size, type, reasoning for categorization
- **Multiple URL formats** - Compatible with various automation systems
- **Staged upload system** - Modern UX allowing context addition before sending

### 🔄 **Progressive Lead Generation**
- **Natural conversation flow** - No forms, just sophisticated dialogue
- **Smart contact collection** - Intelligent timing based on engagement level
- **Enhanced project briefing** - Builds comprehensive specifications through conversation
- **Context-aware responses** - Remembers conversation history and adapts accordingly

### 📊 **Automation-Ready Output**
- **Rigid JSON structure** - 16 consistent fields for reliable automation
- **Webhook integration** - Direct integration with automation workflows
- **Rich lead data** - Contact info, project details, file categorization, engagement analysis
- **Auto-submit capabilities** - Captures leads even when users leave abruptly

## Tech Stack

- **Frontend:** React/Next.js with sophisticated chat UI
- **AI:** Claude 3.5 Sonnet with custom personality and vision capabilities
- **File Storage:** Vercel Blob with intelligent categorization
- **Automation:** Webhook integration for external systems
- **Deployment:** Vercel with auto-deployment pipeline

## Project Status: Production Ready ✅

**Current Capabilities:**
- ✅ **End-to-end file upload system** - Files properly included in automation pipeline
- ✅ **Sophisticated AI personality** - Luxury-level refinement implemented
- ✅ **Image vision capability** - AI can actually analyze uploaded images
- ✅ **Auto-submit functionality** - Captures leads on idle/browser close
- ✅ **Session audit logging** - Prevents missed leads
- ✅ **Production deployment** - Live system handling real prospects
- ✅ **External configuration** - Safe editing without code changes

## Getting Started

### Prerequisites

- Node.js 18+
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- Webhook URL (optional, for automation)

### Quick Setup

1. **Clone and install:**
   ```bash
   git clone [repository-url]
   cd ai-chat-interface
   npm install
   ```

2. **Configure environment:**
   Create `.env.local`:
   ```bash
   # Required
   ANTHROPIC_API_KEY=your_key_here
   
   # Optional (for automation)
   RELAY_WEBHOOK_URL=your_webhook_url_here
   CONTACT_EMAIL=your_contact@example.com
   ```

3. **Run development:**
   ```bash
   npm run dev
   # Visit http://localhost:3001
   ```

## Usage

### Testing the System
- **Main interface:** `http://localhost:3001`
- **Embed view:** `http://localhost:3001/embed`
- **Upload files, have a conversation, submit brief**
- **Check logs for complete pipeline verification**

### Personality Customization

Edit the AI personality safely without touching code:
```
personality/maitre-d-persona.md
```

### Company Context

Configure your company's services and information:
```
company-context.md
```

**Safe editing features:**
- No risk of breaking functionality
- Version controlled changes
- Instant deployment of updates

### Embedding in Websites

```jsx
import ChatWidget from './components/ChatWidget';

function ContactPage() {
  return (
    <div className="contact-section">
      <ChatWidget />
    </div>
  );
}
```

## Architecture

### API Endpoints
- `/api/chat` - Sophisticated AI conversation with vision capabilities
- `/api/submit-brief` - AI extraction + structured JSON + webhook delivery  
- `/api/upload` - File upload with categorization support
- `/api/session-audit` - Session tracking and lead capture monitoring

### Data Flow
```
User Upload → Blob Storage → AI Analysis → Lead Extraction → Webhook → Automation
```

### Lead Data Structure
16-field consistent JSON including:
- Contact information (name, email, company, title)
- Project classification (request type, service category, readiness level)
- Rich project details (brief, inspiration, technical specs, deliverables)
- File categorization (product images vs style references with URLs)
- Conversation analysis (engagement level, next steps, missing info)

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude AI API key |
| `RELAY_WEBHOOK_URL` | No | Automation webhook endpoint |
| `CONTACT_EMAIL` | No | Contact email for follow-up instructions |
| `BLOB_READ_WRITE_TOKEN` | Auto | Vercel Blob storage |

### Configuration Files

**Personality:** `personality/maitre-d-persona.md`
**Company Context:** `company-context.md`

**Benefits:** 
- Safe editing without code risk
- Version controlled changes
- Sophisticated conversation capabilities

## Deployment

**Vercel Auto-Deployment:**
1. Connect repository to Vercel
2. Set environment variables in dashboard
3. Automatic deployment on git push
4. Production URL with custom domain support

**Security Features:**
- Environment variable protection
- Webhook URL security
- File upload validation
- API rate limiting

## Recent Features

### Auto-Submit & Browser Close Detection
- ✅ **Idle detection** - Auto-submits after 60 seconds of inactivity
- ✅ **Browser close detection** - Captures leads even when users leave abruptly
- ✅ **Session audit logging** - Comprehensive tracking to prevent missed leads
- ✅ **Beacon API** - Reliable data transmission even during page unload

### Image Vision Capability
- ✅ **AI image analysis** - Claude can actually "see" and describe uploaded images
- ✅ **Context-aware responses** - AI references specific visual elements
- ✅ **Smart categorization** - Distinguishes product images from style references
- ✅ **Enhanced conversations** - More natural dialogue about visual content

### Enhanced Context System
- ✅ **External company context** - Business information separate from code
- ✅ **Configurable personality** - Easy customization without technical risk
- ✅ **Intelligent responses** - AI understands company services and capabilities
- ✅ **Future-ready** - Can be enhanced with website scraping and dynamic updates

## Business Value

**Higher Quality Leads:** Sophisticated conversation vs contact forms
**Automated Workflow:** Structured data flows directly to operations  
**Premium Positioning:** AI experience reflects agency sophistication
**Enhanced Project Briefs:** Rich context for accurate scoping
**Zero Lead Loss:** Auto-submit prevents missed opportunities

## License

Generic AI chat interface for creative service providers. 