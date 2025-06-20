import ChatWidget from '../components/ChatWidget';

export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
      padding: '20px'
    }}>
      <div style={{ 
        width: '100%',
        maxWidth: '700px'
      }}>
        <ChatWidget />
      </div>
    </div>
  );
}