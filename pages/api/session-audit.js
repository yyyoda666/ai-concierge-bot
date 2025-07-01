import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auditData = req.body;
    
    // Add server timestamp for accuracy
    const auditEntry = {
      ...auditData,
      serverTimestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    };

    // Only log in development to avoid production noise
    if (process.env.NODE_ENV === 'development') {
      try {
        const auditPath = path.join(process.cwd(), 'session-audit-logs.json');
        let auditLogs = [];
        
        if (fs.existsSync(auditPath)) {
          const existingLogs = fs.readFileSync(auditPath, 'utf8');
          auditLogs = JSON.parse(existingLogs);
        }
        
        auditLogs.push(auditEntry);
        
        // Keep only last 1000 entries to prevent file from growing too large
        if (auditLogs.length > 1000) {
          auditLogs = auditLogs.slice(-1000);
        }
        
        fs.writeFileSync(auditPath, JSON.stringify(auditLogs, null, 2));
      } catch (error) {
        // Silent fail for audit logging
      }
    }

    // In production, you might want to send this to a monitoring service
    // or database instead of logging to file

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Session audit error:', error);
    res.status(500).json({ error: 'Audit logging failed' });
  }
} 