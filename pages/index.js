import ChatWidget from '../components/ChatWidget';

export default function Home() {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Intelligence Matters - Progressive Disclosure Chat System</h1>
      
      <div style={{ 
        background: '#f9f9f9', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>🎩 What We Built Today:</h2>
        <ul>
          <li><strong>Progressive Disclosure System:</strong> Chat naturally collects information in stages</li>
          <li><strong>Sophisticated Maître d' Personality:</strong> French restaurant-style refinement</li>
          <li><strong>Advanced JSON Structure:</strong> Captures conversation stages and analysis</li>
          <li><strong>Smart Classification:</strong> Identifies meeting/proposal/test requests</li>
          <li><strong>Language Detection:</strong> Responds in Swedish or English</li>
        </ul>
        
        <h3>📊 New Data Structure:</h3>
        <pre style={{ fontSize: '12px', background: 'white', padding: '10px', borderRadius: '4px' }}>
{`{
  "stage1": { contactInfo, generalInterest, engagementLevel },
  "stage2": { requestType, serviceCategory, confidence },
  "stage3": { specificDetails, timeline, budget },
  "analysis": { readinessLevel, keyTopics, nextSteps }
}`}
        </pre>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h2>Test the Maître d':</h2>
          <p>Try different conversation types:</p>
          <ul>
            <li><strong>Browsing:</strong> "Hi, what do you do with AI?"</li>
            <li><strong>Project Inquiry:</strong> "I have a specific project to discuss"</li>
            <li><strong>Sample Request:</strong> "Can you show me some examples?"</li>
          </ul>
        </div>
        
        <div style={{ flex: 1 }}>
          <ChatWidget />
        </div>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: '#e8f4f8',
        borderRadius: '8px'
      }}>
        <h3>🧪 Technical Notes:</h3>
        <p><strong>Progressive Disclosure:</strong> Instead of forms, conversations naturally flow through stages - opening → classification → details</p>
        <p><strong>Webhook Integration:</strong> Submit Brief sends rich JSON data to Relay.app → Notion/Slack</p>
        <p><strong>AI Analysis:</strong> Every conversation gets analyzed for readiness level, missing info, and next steps</p>
      </div>
    </div>
  );
}