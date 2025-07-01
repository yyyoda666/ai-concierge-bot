# Deployment Guide: Public + Private Configuration

This guide explains how to deploy the generic AI chat system with your private company configurations.

## Architecture Overview

```
📁 Public Repository (GitHub)
├── Generic AI chat system
├── Template files (.example)
└── Open-source codebase

📁 Private Configuration
├── company-context.md (your actual content)
├── personality/maitre-d-persona.md (your actual personality)
└── .env.local (your actual API keys)
```

## Deployment Methods

### Method 1: Manual File Overlay (Simplest)

1. **Clone public repo:**
   ```bash
   git clone [your-public-repo]
   cd ai-chat-interface
   ```

2. **Add your private configs:**
   ```bash
   # Copy your actual files
   cp /path/to/your/company-context.md .
   cp /path/to/your/maitre-d-persona.md personality/
   cp /path/to/your/.env.local .
   ```

3. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

### Method 2: Environment Variables Only

1. **Keep configs in environment variables:**
   ```bash
   # In Vercel dashboard, set:
   COMPANY_CONTEXT="Your full company context here..."
   PERSONALITY_CONFIG="Your personality config here..."
   ```

2. **Update code to read from env vars if files don't exist**

### Method 3: Private Submodule (Advanced)

1. **Create private config repo**
2. **Add as submodule to public repo**
3. **Deploy with both combined**

## Recommended: Method 1 (Manual Overlay)

**Why:** Simple, secure, version-controlled private configs

**Security:** Private configs never hit public repo due to .gitignore

**Workflow:**
1. Develop in public repo
2. Deploy with private overlay
3. Update configs independently
