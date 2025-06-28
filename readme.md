# AI Chat Interface

An intelligent chat interface built with Next.js and Claude AI that replaces traditional contact forms with conversational lead generation.

## Features

- 🤖 **AI-Powered Conversations** - Natural language processing for qualifying leads
- 📁 **File Upload Support** - Image upload with categorization
- 🔄 **Progressive Disclosure** - Builds comprehensive project briefs through conversation
- 📊 **Structured Data Export** - Converts conversations to structured JSON
- 🎯 **Smart Contact Collection** - Intelligent timing for collecting contact information
- 🔗 **Webhook Integration** - Sends lead data to external automation systems

## Tech Stack

- **Frontend:** React/Next.js
- **AI:** Claude 3.5 Sonnet (Anthropic)
- **File Storage:** Vercel Blob
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- Anthropic API key
- Webhook endpoint for lead data (optional)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yyyoda666/intelligence-matters-chat.git
   cd intelligence-matters-chat
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file:
   ```bash
   # Required: Claude AI API key
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   
   # Optional: Webhook URL for lead data
   RELAY_WEBHOOK_URL=your_webhook_url_here
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   Visit `http://localhost:3001`

## Usage

### Main Interface
- Main test page: `http://localhost:3001`
- Clean embed view: `http://localhost:3001/embed`

### Embedding the Chat Widget

```jsx
import ChatWidget from './components/ChatWidget';

function MyPage() {
  return (
    <div>
      <ChatWidget />
    </div>
  );
}
```

## API Endpoints

- `/api/chat` - Handles AI conversation
- `/api/submit-brief` - Processes and exports lead data
- `/api/upload` - Handles file uploads

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude AI API key from Anthropic |
| `RELAY_WEBHOOK_URL` | No | Webhook endpoint for lead data |
| `BLOB_READ_WRITE_TOKEN` | Auto | Vercel Blob storage token |

### Customization

The AI personality and conversation flow can be customized in:
- `pages/api/chat.js` - Main conversation logic
- `pages/api/submit-brief.js` - Lead data processing

## Deployment

This project is optimized for Vercel deployment:

1. **Connect to Vercel:**
   ```bash
   npm i -g vercel
   vercel
   ```

2. **Set environment variables in Vercel dashboard**
3. **Deploy automatically on git push**

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary. 