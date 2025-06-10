/**
 * AI Context Menu Component
 * Provides AI-powered actions for messages
 */

import React, { useState, useEffect, useRef } from 'react';
import './AIContextMenu.css';

const AIContextMenu = ({ isOpen, onClose, position, message, onAction }) => {
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const aiActions = [
    {
      icon: 'fa-language',
      label: 'Translate',
      action: 'translate',
      description: 'Translate to another language'
    },
    {
      icon: 'fa-compress',
      label: 'Summarize',
      action: 'summarize',
      description: 'Create a brief summary'
    },
    {
      icon: 'fa-lightbulb',
      label: 'Explain',
      action: 'explain',
      description: 'Explain in simple terms'
    },
    {
      icon: 'fa-wand-magic-sparkles',
      label: 'Improve',
      action: 'improve',
      description: 'Suggest improvements'
    },
    {
      icon: 'fa-spell-check',
      label: 'Fix Grammar',
      action: 'grammar',
      description: 'Correct grammar and spelling'
    },
    {
      icon: 'fa-list-check',
      label: 'Extract Tasks',
      action: 'tasks',
      description: 'Find action items'
    },
    {
      icon: 'fa-face-smile',
      label: 'Change Tone',
      action: 'tone',
      description: 'Make it more formal/casual'
    },
    {
      icon: 'fa-code',
      label: 'Extract Code',
      action: 'code',
      description: 'Extract code snippets'
    }
  ];

  useEffect(() => {
    if (isOpen && position) {
      // Calculate menu position to ensure it stays within viewport
      const menuWidth = 200;
      const menuHeight = 320;
      const padding = 10;

      let x = position.x;
      let y = position.y;

      // Adjust horizontal position
      if (x + menuWidth > window.innerWidth - padding) {
        x = window.innerWidth - menuWidth - padding;
      }

      // Adjust vertical position
      if (y + menuHeight > window.innerHeight - padding) {
        y = window.innerHeight - menuHeight - padding;
      }

      setMenuPosition({ x, y });
    }
  }, [isOpen, position]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const handleAction = (action) => {
    onAction(action, message);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="ai-context-menu"
      style={{
        position: 'fixed',
        left: `${menuPosition.x}px`,
        top: `${menuPosition.y}px`,
        zIndex: 1000
      }}
    >
      <div className="ai-context-menu-header">
        <i className="fa-solid fa-robot"></i>
        <span>AI Actions</span>
      </div>
      <div className="ai-context-menu-items">
        {aiActions.map((action) => (
          <button
            key={action.action}
            className="ai-context-menu-item"
            onClick={() => handleAction(action.action)}
          >
            <i className={`fa-solid ${action.icon}`}></i>
            <div className="ai-context-menu-item-content">
              <div className="ai-context-menu-item-label">{action.label}</div>
              <div className="ai-context-menu-item-description">{action.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AIContextMenu;