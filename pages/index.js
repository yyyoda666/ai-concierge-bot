import ChatWidget from '../components/ChatWidget';

export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fafafa',
      padding: '20px'
    }}>
      <div style={{ 
        width: '100%',
        maxWidth: '700px',
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{ 
          fontSize: '32px',
          fontWeight: '600',
          color: '#333',
          marginBottom: '8px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          IM Concierge
        </h1>
        <p style={{ 
          fontSize: '16px',
          color: '#666',
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          How can we assist you today?
        </p>
      </div>
      
      <div style={{ 
        width: '100%',
        maxWidth: '700px'
      }}>
        <ChatWidget />
      </div>
    </div>
  );
}