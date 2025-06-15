import { useState, useRef, useEffect } from 'react';

export default function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => 'conv_' + Date.now());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { type: 'bot', content: data.response }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-widget">
      <div className="chat-header">
        <h3>Intelligence Matters</h3>
        <p>Tell us about your project</p>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message bot">
            <div className="message-content">
              <div className="typing-indicator">...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={!input.trim() || isLoading}>
          Send
        </button>
      </div>

      <style jsx>{`
        .chat-widget {
          width: 400px;
          height: 500px;
          border: 1px solid #ddd;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          background: white;
        }
        .chat-header {
          padding: 16px;
          border-bottom: 1px solid #eee;
          background: #f9f9f9;
        }
        .chat-header h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
        }
        .chat-header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .message {
          display: flex;
        }
        .message.user {
          justify-content: flex-end;
        }
        .message.bot {
          justify-content: flex-start;
        }
        .message-content {
          max-width: 80%;
          padding: 8px 12px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.4;
        }
        .message.user .message-content {
          background: #000;
          color: white;
        }
        .message.bot .message-content {
          background: #f0f0f0;
          color: #333;
        }
        .typing-indicator {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .chat-input {
          padding: 16px;
          border-top: 1px solid #eee;
          display: flex;
          gap: 8px;
        }
        .chat-input input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 20px;
          outline: none;
        }
        .chat-input input:focus {
          border-color: #000;
        }
        .chat-input button {
          padding: 8px 16px;
          background: #000;
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
        }
        .chat-input button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}