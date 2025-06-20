import { useState, useRef, useEffect } from 'react';

export default function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conversationId] = useState(() => 'conv_' + Date.now());
  const [showSubmitMode, setShowSubmitMode] = useState(false);
  const [autoSubmitTimer, setAutoSubmitTimer] = useState(null);
  const [timeUntilAutoSubmit, setTimeUntilAutoSubmit] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const fileInputRef = useRef(null);

  // Auto-submit configuration
  const AUTO_SUBMIT_DELAY = 5 * 60 * 1000; // 5 minutes in milliseconds
  const WARNING_TIME = 60 * 1000; // Show warning 1 minute before auto-submit



  // Communicate height changes to parent iframe
  useEffect(() => {
    const height = isExpanded ? 500 : 60;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'resize', height }, '*');
    }
  }, [isExpanded]);

  // Function to check if conversation is ready for auto-submit
  const isConversationReadyForAutoSubmit = () => {
    // Don't auto-submit if we already have
    if (hasAutoSubmitted) return false;
    
    const hasProjectContent = messages.some(msg => 
      msg.type === 'bot' && (
        msg.content.toLowerCase().includes('brief') ||
        msg.content.toLowerCase().includes('project') ||
        msg.content.toLowerCase().includes('shoot') ||
        msg.content.toLowerCase().includes('test')
      )
    );
    const hasContactInfo = messages.some(msg => 
      msg.type === 'user' && (
        msg.content.includes('@') || // likely email
        msg.content.toLowerCase().includes('name')
      )
    );
    
    return messages.length >= 4 && hasProjectContent && hasContactInfo;
  };

  // Auto-submit timer management
  const resetAutoSubmitTimer = () => {
    // Clear existing timer
    if (autoSubmitTimer) {
      clearTimeout(autoSubmitTimer);
      setAutoSubmitTimer(null);
    }
    setTimeUntilAutoSubmit(null);

    // Only set new timer if conversation is ready for auto-submit
    if (isConversationReadyForAutoSubmit()) {
      console.log('Setting auto-submit timer for 5 minutes...');
      
      // Warning timer (4 minutes)
      const warningTimer = setTimeout(() => {
        setTimeUntilAutoSubmit(60); // Show 60 second countdown
        
        // Countdown timer
        let secondsLeft = 60;
        const countdownTimer = setInterval(() => {
          secondsLeft--;
          setTimeUntilAutoSubmit(secondsLeft);
          
          if (secondsLeft <= 0) {
            clearInterval(countdownTimer);
          }
        }, 1000);
      }, AUTO_SUBMIT_DELAY - WARNING_TIME);

      // Actual auto-submit timer
      const newTimer = setTimeout(() => {
        console.log('Auto-submitting brief due to inactivity...');
        autoSubmitBrief();
      }, AUTO_SUBMIT_DELAY);

      setAutoSubmitTimer(newTimer);
    }
  };

  // Auto-submit function (similar to manual submit but with different messaging)
  const autoSubmitBrief = async () => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    setTimeUntilAutoSubmit(null);
    
    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add auto-submit flag to the conversation
      conversationHistory.push({
        role: 'system',
        content: 'AUTO_SUBMIT: Brief automatically submitted due to user inactivity after 5 minutes'
      });

      const response = await fetch('/api/submit-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory,
          conversationId,
          autoSubmit: true
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Mark as auto-submitted to prevent future auto-submits
        setHasAutoSubmitted(true);
        
        setMessages(prev => [...prev, { 
          type: 'bot', 
          content: 'I\'ve automatically submitted your brief since we had such a great conversation! Our team will review it and get back to you soon. Feel free to continue chatting if you\'d like to add more details or have other questions.' 
        }]);
        setShowSubmitMode(false);
      } else {
        console.error('Auto-submit failed:', data.details);
        // Don't show error to user for auto-submit, just log it
      }
    } catch (error) {
      console.error('Auto-submit error:', error);
      // Don't show error to user for auto-submit, just log it
    }
    
    setIsSubmitting(false);
  };

  // Cancel auto-submit (when user becomes active again)
  const cancelAutoSubmit = () => {
    if (autoSubmitTimer) {
      clearTimeout(autoSubmitTimer);
      setAutoSubmitTimer(null);
    }
    setTimeUntilAutoSubmit(null);
  };

  // File upload handling
  const handleFileUpload = async (file, fileType = null) => {
    if (!file) return;

    // Cancel any pending auto-submit when user becomes active
    cancelAutoSubmit();

    // Use the file type specified by the button clicked
    const uploadType = fileType || 'product'; // Default to product if somehow no type

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Add file message to chat with type indicator
        const typeIcon = uploadType === 'product' ? '📦' : '🎨';
        const typeLabel = uploadType === 'product' ? 'Product Image' : 'Style Reference';
        const fileMessage = `${typeIcon} Uploaded ${typeLabel}: ${data.file.originalName}`;
        
        setMessages(prev => [...prev, { 
          type: 'user', 
          content: fileMessage,
          file: { ...data.file, uploadType }
        }]);

        // Send to AI with file context and type
        const contextMessage = uploadType === 'product' 
          ? `User uploaded a PRODUCT IMAGE: ${data.file.originalName}. This is their actual product that needs to be photographed. Please acknowledge and ask relevant questions about the product itself (e.g., "Thanks for showing me your product! What angles or features do you want to highlight?" or "Great! Is this the only product variation you need shot?")`
          : `User uploaded a STYLE REFERENCE: ${data.file.originalName}. This is an inspiration/example of the aesthetic they want. Please acknowledge and ask relevant questions about the style (e.g., "Perfect reference! Is this the exact style you're looking for?" or "Great inspiration! Do you want to match this lighting/composition exactly?")`;

        const aiResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: contextMessage,
            conversationId: conversationId,
            fileInfo: { ...data.file, uploadType }
          })
        });

        const aiData = await aiResponse.json();
        setMessages(prev => [...prev, { type: 'bot', content: aiData.response }]);
        
      } else {
        alert('Upload failed: ' + (data.details || 'Unknown error'));
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file. Please try again.');
    }

    setIsUploading(false);
  };

  const triggerFileUpload = () => {
    // The AI context will determine how to handle the upload
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Determine file type based on conversation context
      const lastBotMessage = messages.filter(msg => msg.type === 'bot').pop()?.content || '';
      const fileType = lastBotMessage.toLowerCase().includes('product') ? 'product' : 'reference';
      handleFileUpload(file, fileType);
      // Reset file input
      e.target.value = '';
    }
  };

  // Reset timer when user sends message
  useEffect(() => {
    resetAutoSubmitTimer();
  }, [messages.length]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSubmitTimer) {
        clearTimeout(autoSubmitTimer);
      }
    };
  }, [autoSubmitTimer]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Expand the widget on first interaction
    if (!isExpanded) {
      setIsExpanded(true);
    }

    // Cancel any pending auto-submit when user becomes active
    cancelAutoSubmit();

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
      
      // Check if we should show submit mode (smart logic based on conversation content)
      // Only show submit mode if we have substantial project discussion, not just contact collection
      const hasProjectContent = messages.some(msg => 
        msg.type === 'bot' && (
          msg.content.toLowerCase().includes('brief') ||
          msg.content.toLowerCase().includes('project') ||
          msg.content.toLowerCase().includes('shoot') ||
          msg.content.toLowerCase().includes('test')
        )
      );
      const hasContactInfo = messages.some(msg => 
        msg.type === 'user' && (
          msg.content.includes('@') || // likely email
          msg.content.toLowerCase().includes('name')
        )
      );
      
      if (messages.length >= 6 && hasProjectContent && hasContactInfo) {
        setShowSubmitMode(true);
      }
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

  const submitBrief = async () => {
    if (messages.length === 0) {
      alert('No conversation to submit. Please chat first!');
      return;
    }

    // Check if we have sufficient information to submit
    const hasContactInfo = messages.some(msg => 
      msg.type === 'user' && msg.content.includes('@')
    );
    
    if (!hasContactInfo) {
      alert('Please provide your contact details first before submitting the brief.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Convert messages format to match API expectations
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch('/api/submit-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory,
          conversationId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Add success message to chat instead of alert
        const hasFiles = data.leadData?.uploadedFiles?.length > 0;
        const fileMessage = hasFiles ? 
          '' : 
          ` If you need to send visual references later, email them to jacob@intelligencematters.se with the subject "Project REF: ${conversationId}".`;
        
        setMessages(prev => [...prev, { 
          type: 'bot', 
          content: `Perfect! Your brief has been submitted successfully. Our team will review it and get back to you soon.${fileMessage} Would you like to refine any details, submit another brief, or is there anything else I can help you with?` 
        }]);
        setShowSubmitMode(false); // Reset submit mode after successful submission
      } else {
        alert('Error submitting brief: ' + (data.details || 'Unknown error'));
      }
    } catch (error) {
      console.error('Submit brief error:', error);
      alert('Failed to submit brief. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="chat-widget">
      
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            <div className="message-content">
              {msg.content}
              {msg.file && (
                <div className={`file-attachment ${msg.file.uploadType || ''}`}>
                  <img src={msg.file.url} alt={msg.file.originalName} className="uploaded-image" />
                  <span className="file-name">{msg.file.originalName}</span>
                </div>
              )}
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
        
      </div>

      {timeUntilAutoSubmit !== null && isExpanded && (
        <div className="auto-submit-warning">
          ⚠️ Auto-submitting your brief in {timeUntilAutoSubmit} seconds. Send a message to cancel.
          <button onClick={cancelAutoSubmit} className="cancel-auto-submit">
            Cancel Auto-Submit
          </button>
        </div>
      )}

      <div className="chat-input">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
        {isExpanded && (
          <button 
            onClick={triggerFileUpload} 
            disabled={isLoading || isUploading}
            className="file-upload-btn"
            title="Upload image"
          >
            {isUploading ? '⏳' : '📎'}
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={showSubmitMode ? "Ready to submit your brief, or send a message to add more..." : isExpanded ? "Type your message..." : "Message IM Concierge..."}
          disabled={isLoading || isUploading}
        />
        <button onClick={showSubmitMode ? submitBrief : sendMessage} disabled={(!input.trim() && !showSubmitMode) || isLoading || isSubmitting || isUploading}>
          {isSubmitting ? 'Submitting...' : showSubmitMode ? 'Submit Brief' : '↗'}
        </button>
      </div>

      <style jsx>{`
        .chat-widget {
          width: 100%;
          max-width: 100%;
          height: ${isExpanded ? '500px' : '60px'};
          min-height: ${isExpanded ? '500px' : '60px'};
          border: ${isExpanded ? '1px solid #ddd' : 'none'};
          border-radius: ${isExpanded ? '12px' : '0'};
          display: flex;
          flex-direction: column;
          background: ${isExpanded ? 'white' : 'transparent'};
          box-shadow: ${isExpanded ? '0 4px 20px rgba(0,0,0,0.1)' : 'none'};
          transition: all 0.3s ease-in-out;
          overflow: hidden;
          position: relative;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: ${isExpanded ? '16px' : '0'};
          display: ${isExpanded ? 'flex' : 'none'};
          flex-direction: column;
          gap: 12px;
          min-height: 0;
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
          padding: ${isExpanded ? '16px' : '0'};
          border-top: ${isExpanded ? '1px solid #eee' : 'none'};
          display: flex;
          gap: 8px;
          background: ${isExpanded ? 'white' : 'transparent'};
        }
        .chat-input input {
          flex: 1;
          padding: ${isExpanded ? '12px 16px' : '16px 20px'};
          border: 1px solid #ddd;
          border-radius: ${isExpanded ? '12px' : '25px'};
          outline: none;
          font-size: ${isExpanded ? '14px' : '16px'};
          background: white;
          box-shadow: ${isExpanded ? 'none' : '0 2px 10px rgba(0,0,0,0.1)'};
          transition: all 0.2s ease;
        }
        .chat-input input:focus {
          border-color: #000;
          box-shadow: ${isExpanded ? '0 0 0 2px rgba(0,0,0,0.1)' : '0 2px 15px rgba(0,0,0,0.15)'};
        }
        .chat-input button {
          padding: ${isExpanded ? '12px 16px' : '16px 20px'};
          background: #000;
          color: white;
          border: none;
          border-radius: ${isExpanded ? '12px' : '25px'};
          cursor: pointer;
          font-size: ${isExpanded ? '14px' : '16px'};
          min-width: ${isExpanded ? 'auto' : '60px'};
          transition: all 0.2s ease;
        }
        .chat-input button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .chat-actions {
          padding: 12px 16px;
          border-top: 1px solid #eee;
          background: #f9f9f9;
        }
        .submit-brief-btn {
          width: 100%;
          padding: 10px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .submit-brief-btn:hover:not(:disabled) {
          background: #0056b3;
        }
        .submit-brief-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .auto-submit-warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 12px 16px;
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: pulse-warning 1s infinite;
        }
        .cancel-auto-submit {
          background: #6c757d;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
        }
        .cancel-auto-submit:hover {
          background: #545b62;
        }
        @keyframes pulse-warning {
          0%, 100% { background-color: #fff3cd; }
          50% { background-color: #ffeaa7; }
        }
        .file-upload-btn {
          padding: 8px 12px;
          background: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 20px;
          cursor: pointer;
          font-size: 16px;
          margin-right: 8px;
        }
        .file-upload-btn:hover:not(:disabled) {
          background: #e0e0e0;
        }
        .file-upload-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .file-attachment {
          margin-top: 8px;
          padding: 8px;
          border-radius: 8px;
          border-left: 4px solid #ccc;
        }
        .file-attachment.product {
          background: rgba(76, 175, 80, 0.1);
          border-left-color: #4CAF50;
        }
        .file-attachment.reference {
          background: rgba(156, 39, 176, 0.1);
          border-left-color: #9C27B0;
        }
        .uploaded-image {
          max-width: 200px;
          max-height: 150px;
          border-radius: 4px;
          display: block;
          margin-bottom: 4px;
        }
        .file-name {
          font-size: 12px;
          opacity: 0.8;
        }

        /* Responsive Design for Embedding */
        @media (max-width: 768px) {
          .chat-widget {
            height: ${isExpanded ? 'min(80vh, 500px)' : '70px'};
            border-radius: 8px;
          }
          .chat-header {
            padding: ${isExpanded ? '12px' : '8px 12px'};
            min-height: ${isExpanded ? 'auto' : '54px'};
          }
          .chat-header h3 {
            font-size: ${isExpanded ? '16px' : '15px'};
          }
          .chat-messages {
            padding: ${isExpanded ? '12px' : '0'};
            gap: 10px;
          }
          .chat-input {
            padding: ${isExpanded ? '12px' : '0'};
            gap: 6px;
          }
          .message-content {
            max-width: 85%;
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .chat-widget {
            height: ${isExpanded ? 'min(85vh, 450px)' : '65px'};
          }
          .chat-header h3 {
            font-size: ${isExpanded ? '15px' : '14px'};
          }
          .expand-indicator {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}