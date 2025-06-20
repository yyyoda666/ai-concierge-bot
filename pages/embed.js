import ChatWidget from '../components/ChatWidget';
import { useEffect } from 'react';

export default function EmbedPage() {
  useEffect(() => {
    // Listen for resize messages from the ChatWidget
    const handleMessage = (event) => {
      if (event.data.type === 'resize') {
        // Update the document body height to match widget height
        document.body.style.height = `${event.data.height}px`;
        document.documentElement.style.height = `${event.data.height}px`;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div style={{ 
      margin: 0,
      padding: 0,
      backgroundColor: 'transparent',
      height: '60px', // Start with collapsed height
      transition: 'height 0.3s ease-in-out'
    }}>
      <ChatWidget />
    </div>
  );
}