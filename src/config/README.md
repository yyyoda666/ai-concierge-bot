# Configuration

External configuration files and constants.

## Purpose

- Application constants
- Feature flags
- External phrase libraries
- Configuration objects
- Environment-specific settings

## Future Structure

```
config/
├── phrases.md      # AI response phrases and variations
├── constants.js    # Application constants
├── features.js     # Feature flags
└── endpoints.js    # API endpoint configurations
```

## Benefits

- Non-developers can edit phrases and copy
- Configuration changes without code deployments
- Clean separation of content and logic 