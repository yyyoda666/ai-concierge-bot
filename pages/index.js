import ChatWidget from '../components/ChatWidget';

export default function Home() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Intelligence Matters - Chat Test</h1>
      <p>Testing the chat widget integration</p>
      <div style={{ marginTop: '20px' }}>
        <ChatWidget />
      </div>
    </div>
  );
}