import React, { useEffect, useRef, useState } from 'react';
import { Bot, Layers3, Send, Sparkles } from 'lucide-react';
import './FounderChatbot.css';

export const FounderChatbot = ({ assessment }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I’m your LabX Founder Assistant${assessment?.calculated_stage ? ` for the ${assessment.calculated_stage} stage` : ''}. Ask me what to work on next, how to validate your idea, or how to progress from your current level.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    setMessages((current) => [...current, { role: 'user', content: message }]);
    setInput('');
    setSending(true);

    const stage = assessment?.calculated_stage || 'current';
    const level = assessment?.calculated_level || 'assigned';
    const domain = assessment?.calculated_domain || 'selected';
    const reply = `Based on your ${domain} assessment, you are at Level ${level} in the ${stage} stage. Focus your next question on customer validation, evidence, or defining the smallest useful MVP.`;

    window.setTimeout(() => {
      setMessages((current) => [...current, { role: 'assistant', content: reply }]);
      setSending(false);
    }, 350);
  };

  return (
    <section className="founder-chatbot" aria-label="LabX Founder Assistant">
      <header className="founder-chatbot__header">
        <div className="founder-chatbot__avatar"><Bot size={26} /></div>
        <div className="founder-chatbot__identity">
          <h2>Founder Assistant</h2>
          <p>Personalized to your assessment</p>
        </div>
        {assessment?.calculated_level && (
          <div className="founder-chatbot__level" title="Your assessment level">
            <Layers3 size={16} />
            <span>Level {assessment.calculated_level}</span>
          </div>
        )}
      </header>

      <div className="founder-chatbot__messages" aria-live="polite">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`founder-chatbot__message founder-chatbot__message--${message.role}`}>
            {message.role === 'assistant' && <Sparkles size={15} />}
            <span>{message.content}</span>
          </div>
        ))}
        {sending && <div className="founder-chatbot__typing">Founder Assistant is thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <form className="founder-chatbot__form" onSubmit={sendMessage}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask your founder assistant…"
          aria-label="Message Founder Assistant"
        />
        <button type="submit" disabled={!input.trim() || sending} aria-label="Send message">
          <Send size={18} />
        </button>
      </form>
    </section>
  );
};
