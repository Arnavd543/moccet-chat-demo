/**
 * AI Suggested Replies Component
 * Shows AI-generated reply suggestions
 */

import React, { useState, useEffect } from 'react';
import aiService from '../services/aiService';
import './AISuggestedReplies.css';

const AISuggestedReplies = ({ messages, channelInfo, onSelectReply }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show suggestions when there are recent messages
    if (messages && messages.length > 2) {
      const lastMessage = messages[messages.length - 1];
      const timeSinceLastMessage = Date.now() - new Date(lastMessage.createdAt).getTime();
      
      // Show suggestions if last message was within 5 minutes and not from current user
      if (timeSinceLastMessage < 5 * 60 * 1000 && !lastMessage.isCurrentUser) {
        loadSuggestions();
      } else {
        setIsVisible(false);
      }
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSuggestions = async () => {
    setLoading(true);
    setIsVisible(true);
    
    try {
      const replies = await aiService.generateSuggestedReplies(messages, { channelInfo });
      setSuggestions(replies);
    } catch (error) {
      console.error('Error loading suggested replies:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReply = (reply) => {
    onSelectReply(reply);
    setIsVisible(false);
  };

  const handleRefresh = () => {
    loadSuggestions();
  };

  if (!isVisible) return null;

  return (
    <div className="ai-suggested-replies">
      <div className="ai-suggested-header">
        <div className="ai-suggested-title">
          <i className="fa-solid fa-wand-magic-sparkles"></i>
          <span>Suggested Replies</span>
        </div>
        <div className="ai-suggested-actions">
          <button 
            className="ai-suggested-action"
            onClick={handleRefresh}
            disabled={loading}
            title="Generate new suggestions"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
          </button>
          <button 
            className="ai-suggested-action"
            onClick={() => setIsVisible(false)}
            title="Hide suggestions"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      
      <div className="ai-suggested-replies-list">
        {loading ? (
          <div className="ai-suggested-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Generating suggestions...</span>
          </div>
        ) : suggestions.length > 0 ? (
          suggestions.map((reply, index) => (
            <button
              key={index}
              className="ai-suggested-reply"
              onClick={() => handleSelectReply(reply)}
            >
              <span className="ai-suggested-reply-text">{reply}</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          ))
        ) : (
          <div className="ai-suggested-empty">
            No suggestions available
          </div>
        )}
      </div>
    </div>
  );
};

export default AISuggestedReplies;