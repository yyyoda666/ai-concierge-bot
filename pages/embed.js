import ChatWidget from '../components/ChatWidget';

export default function EmbedDemo() {
  return (
    <div style={{ 
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1>Intelligence Matters - Embed Demo</h1>
      <p>This demonstrates how the chatbot looks when embedded in your Figma site.</p>
      
      {/* Container showing different widths */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Full Width Container (100%)</h2>
        <div style={{ 
          width: '100%', 
          backgroundColor: 'white', 
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <ChatWidget />
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Medium Width Container (600px)</h2>
        <div style={{ 
          width: '600px', 
          backgroundColor: 'white', 
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          margin: '0 auto'
        }}>
          <ChatWidget />
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Mobile Width Container (350px)</h2>
        <div style={{ 
          width: '350px', 
          backgroundColor: 'white', 
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          margin: '0 auto'
        }}>
          <ChatWidget />
        </div>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h2>Embedding Instructions for Figma Sites</h2>
        <p><strong>Iframe Embed Code:</strong></p>
        <code style={{ 
          display: 'block', 
          padding: '10px', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '4px',
          fontSize: '12px',
          overflowX: 'auto'
        }}>
          {`<iframe 
  src="https://your-vercel-url.vercel.app/embed" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: none; border-radius: 8px;">
</iframe>`}
        </code>
        
        <p><strong>Features:</strong></p>
        <ul>
          <li>✅ Starts collapsed (80px height) to save space</li>
          <li>✅ Expands to 70% viewport height when user interacts</li>
          <li>✅ Takes full width of container</li>
          <li>✅ Responsive design for mobile/tablet</li>
          <li>✅ Smooth animations and modern styling</li>
          <li>✅ Click header to expand manually</li>
        </ul>
      </div>
    </div>
  );
}