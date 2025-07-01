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
  const [stagedFile, setStagedFile] = useState(null); // New state for staged file

  const fileInputRef = useRef(null);

  // Auto-submit configuration
  const AUTO_SUBMIT_DELAY = 4 * 60 * 1000; // 4 minutes total (2 min silent + 2 min countdown)
  const WARNING_TIME = 2 * 60 * 1000; // Show 2-minute countdown after 2 minutes of silence

  // Communicate height changes to parent iframe
  useEffect(() => {
    const height = isExpanded ? 500 : 60;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'resize', height }, '*');
    }
  }, [isExpanded]);

  // Browser close detection and session audit
  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      // Check if we have a conversation worth saving
      if (isConversationReadyForAutoSubmit() && !hasAutoSubmitted) {
        // Try to auto-submit before page closes
        event.preventDefault();
        event.returnValue = 'You have an ongoing conversation. Are you sure you want to leave?';
        
        // Use sendBeacon for reliable data transmission even as page closes
        const conversationHistory = messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
          ...(msg.file && { file: msg.file })
        }));

        // Add browser close flag
        conversationHistory.push({
          role: 'system',
          content: 'BROWSER_CLOSE: Brief automatically submitted due to user leaving page'
        });

        const payload = JSON.stringify({
          conversationHistory,
          conversationId,
          browserClose: true,
          source: 'browser_close_detection'
        });

        // Use sendBeacon for reliable transmission even during page unload
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/submit-brief', payload);
        }
        
        return event.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isConversationReadyForAutoSubmit() && !hasAutoSubmitted) {
        // Page became hidden, potentially about to close
        setTimeUntilAutoSubmit(null);
        // Reset auto-submit timer to be more aggressive
        resetAutoSubmitTimer();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [messages, hasAutoSubmitted, conversationId]);

  // Session audit logging
  useEffect(() => {
    const auditLog = {
      timestamp: new Date().toISOString(),
      conversationId,
      messageCount: messages.length,
      hasFiles: messages.some(msg => msg.file),
      readyForSubmit: isConversationReadyForAutoSubmit(),
      autoSubmitted: hasAutoSubmitted,
      isExpanded,
      location: window.location.href
    };

    // Send audit log (non-blocking)
    if (messages.length > 0) {
      fetch('/api/session-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditLog)
      }).catch(() => {
        // Silent fail for audit logging
      });
    }
  }, [messages.length, hasAutoSubmitted, isExpanded]);

  // LLM-based conversation analysis function
  const analyzeConversationState = async () => {
    if (messages.length < 2) return { hasEmail: false, hasProjectDetails: false, readyForSubmission: false };
    
    try {
      const analysisPrompt = `Analyze this conversation quickly:

${messages.map(msg => `${msg.type.toUpperCase()}: ${msg.content}`).join('\n')}

Return ONLY this JSON:
{"hasEmail": boolean, "hasProjectDetails": boolean, "readyForSubmission": boolean}`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: analysisPrompt,
          conversationId: conversationId + '_analysis',
          skipLogging: true
        })
      });

      const data = await response.json();
      const jsonMatch = data.response.match(/\{[^}]+\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    
    // Fallback to simple detection
    return {
      hasEmail: messages.some(msg => msg.type === 'user' && msg.content.includes('@')),
      hasProjectDetails: messages.length > 4,
      readyForSubmission: false
    };
  };

  // Function to check if conversation is ready for auto-submit
  const isConversationReadyForAutoSubmit = () => {
    // Don't auto-submit if we already have
    if (hasAutoSubmitted) return false;
    
    // Use simpler heuristics for auto-submit (LLM analysis is too expensive for frequent checks)
    const hasEmail = messages.some(msg => msg.type === 'user' && msg.content.includes('@'));
    const hasSubstantialConversation = messages.length >= 8; // Increased from 4 to 8 messages
    const hasProjectMentions = messages.some(msg => 
      msg.type === 'bot' && (
        msg.content.toLowerCase().includes('brief') ||
        msg.content.toLowerCase().includes('project') ||
        msg.content.toLowerCase().includes('submit')
      )
    );
    
    return hasSubstantialConversation && hasEmail && hasProjectMentions;
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
      console.log('Setting auto-submit timer: 2 minutes silent, then 2-minute countdown...');
      
      // Warning timer (after 2 minutes of silence)
      const warningTimer = setTimeout(() => {
        setTimeUntilAutoSubmit(120); // Show 120 second countdown (2 minutes)
        
        // Countdown timer
        let secondsLeft = 120; // Start 2-minute countdown
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
        content: msg.content,
        // Include file information if present
        ...(msg.file && { file: msg.file })
      }));

      // Add auto-submit flag to the conversation
      conversationHistory.push({
        role: 'system',
        content: 'AUTO_SUBMIT: Brief automatically submitted due to user inactivity after 4 minutes (2 min silent + 2 min countdown)'
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

  // File upload handling - now stages file instead of auto-sending
  const handleFileUpload = async (file) => {
    if (!file) return;

    // Cancel any pending auto-submit when user becomes active
    cancelAutoSubmit();

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
        // Stage the file instead of sending immediately
        setStagedFile(data.file);
        
        // Optionally show a preview message in the input area
        setInput(prev => prev ? `${prev}\n📎 ${data.file.originalName}` : `📎 ${data.file.originalName}`);
        
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
      // Simple generic file upload - let the AI figure out the context
      handleFileUpload(file);
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
    if (!input.trim() && !stagedFile) return;

    // Expand the widget on first interaction
    if (!isExpanded) {
      setIsExpanded(true);
    }

    // Cancel any pending auto-submit when user becomes active
    cancelAutoSubmit();

    const userMessage = input.trim();
    const messageWithFile = stagedFile; // Capture staged file before clearing
    
    setInput('');
    setStagedFile(null); // Clear staged file
    
    // Add user message with optional file attachment
    const userMessageObj = { 
      type: 'user', 
      content: userMessage || `📎 ${messageWithFile.originalName}`,
      ...(messageWithFile && { file: messageWithFile })
    };
    
    setMessages(prev => [...prev, userMessageObj]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage || `User uploaded an image: ${messageWithFile.originalName}`,
          conversationId: conversationId,
          ...(messageWithFile && { fileInfo: messageWithFile })
        })
      });

      const data = await response.json();
      
      // Check if AI triggered READY_TO_SUBMIT
      const aiTriggeredSubmit = data.response.includes('READY_TO_SUBMIT');
      
      // Clean the response by removing READY_TO_SUBMIT if present
      const cleanResponse = data.response.replace(/READY_TO_SUBMIT\s*/g, '').trim();
      
      setMessages(prev => [...prev, { type: 'bot', content: cleanResponse }]);
      
      // Show submit mode if AI triggered it or fallback to old logic
      if (aiTriggeredSubmit) {
        setShowSubmitMode(true);
      } else {
        // Fallback logic - use LLM analysis for better accuracy
        analyzeConversationState().then(state => {
          if (state.readyForSubmission || (messages.length >= 6 && state.hasEmail && state.hasProjectDetails)) {
            setShowSubmitMode(true);
          }
        });
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
    const hasEmail = messages.some(msg => 
      msg.type === 'user' && msg.content.includes('@')
    );
    
    if (!hasEmail) {
      alert('Please provide your email address first before submitting the brief.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Convert messages format to match API expectations
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
        // Include file information if present
        ...(msg.file && { file: msg.file })
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
          ` If you need to send visual references later, email them to the project contact with the subject "Project REF: ${conversationId}".`;
        
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

      {/* Staged file indicator */}
      {stagedFile && isExpanded && (
        <div className="staged-file-indicator">
          <div className="staged-file-preview">
            <img src={stagedFile.url} alt={stagedFile.originalName} className="staged-image-preview" />
            <div className="staged-file-info">
              <span className="staged-file-name">📎 {stagedFile.originalName}</span>
              <span className="staged-file-hint">Add a message and press send</span>
            </div>
            <button onClick={() => setStagedFile(null)} className="remove-staged-file" title="Remove file">
              ✕
            </button>
          </div>
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
          placeholder={stagedFile ? "Add a message for your uploaded image..." : showSubmitMode ? "Ready to submit your brief, or send a message to add more..." : isExpanded ? "Type your message..." : "Message IM Concierge..."}
          disabled={isLoading || isUploading}
        />
        <button onClick={showSubmitMode ? submitBrief : sendMessage} disabled={(!input.trim() && !stagedFile && !showSubmitMode) || isLoading || isSubmitting || isUploading}>
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

        /* Staged file indicator styles */
        .staged-file-indicator {
          padding: 12px 16px;
          border-top: 1px solid #eee;
          background: #f8f9fa;
        }
        .staged-file-preview {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          position: relative;
        }
        .staged-image-preview {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        .staged-file-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 2px;
        }
        .staged-file-name {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }
        .staged-file-hint {
          font-size: 12px;
          color: #666;
        }
        .remove-staged-file {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .remove-staged-file:hover {
          background: rgba(0, 0, 0, 0.9);
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