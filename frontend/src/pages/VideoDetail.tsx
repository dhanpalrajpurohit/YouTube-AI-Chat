import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Sparkles, AlertCircle, RotateCcw, ThumbsUp, Share2, MoreHorizontal, Video, X } from 'lucide-react';

interface Message { id: string; text: string; sender: 'user' | 'bot'; loading?: boolean }

const VideoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([{ id: '1', text: 'I’m getting this video ready. You’ll be able to ask questions as soon as it’s processed.', sender: 'bot', loading: true }]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    let active = true;
    const processVideo = async () => {
      setIsProcessing(true); setError('');
      setMessages([{ id: Date.now().toString(), text: 'I’m getting this video ready. You’ll be able to ask questions as soon as it’s processed.', sender: 'bot', loading: true }]);
      try {
        const response = await fetch(`${BACKEND_URL}/api/process-video`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ video_id: id }) });
        if (!response.ok) throw new Error('Failed to process video');
        if (active) setMessages([{ id: Date.now().toString(), text: 'Video ready. I can answer questions using its transcript.', sender: 'bot' }]);
      } catch {
        if (active) {
          setError('I couldn’t read a transcript for this video. It may not have captions available.');
          setMessages([{ id: Date.now().toString(), text: 'I couldn’t prepare this video. Check that captions are available, then try again.', sender: 'bot' }]);
        }
      } finally { if (active) setIsProcessing(false); }
    };
    if (id) processVideo();
    return () => { active = false; };
  }, [id, BACKEND_URL]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isProcessing || isSending) return;
    const question = text.trim(); setInput(''); setIsSending(true);
    const userId = `${Date.now()}`; const responseId = `${Date.now()}-response`;
    setMessages((prev) => [...prev, { id: userId, text: question, sender: 'user' }, { id: responseId, text: '', sender: 'bot', loading: true }]);
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ video_id: id, query: question }) });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      setMessages((prev) => prev.map((msg) => msg.id === responseId ? { ...msg, text: data.response || 'I couldn’t find an answer in this video.', loading: false } : msg));
    } catch {
      setMessages((prev) => prev.map((msg) => msg.id === responseId ? { ...msg, text: 'I hit a connection issue. Please try asking again.', loading: false } : msg));
    } finally { setIsSending(false); }
  };

  const handleSendMessage = (e: React.FormEvent) => { e.preventDefault(); void sendMessage(input); };
  const askPrompt = (prompt: string) => { setInput(prompt); document.querySelector<HTMLInputElement>('.chat-input')?.focus(); };

  return <div className="detail-page">
    <section className="video-section">
      <div className="iframe-container"><iframe src={`https://www.youtube.com/embed/${id}`} title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
      <div className="video-title-block"><h1>Watch and chat with AI</h1><p>Get the key ideas, ask follow-up questions, and explore this video at your own pace.</p></div>
      <div className="video-actions"><div className="channel-avatar large">AI</div><div className="channel-heading"><strong>AI TubeChat</strong><span>Your video companion</span></div><button className="subscribe-button"><Video size={17} fill="currentColor" /> Subscribe</button><div className="action-spacer" /><button className="video-action"><ThumbsUp size={18} /><span>Like</span></button><button className="video-action"><Share2 size={18} /><span>Share</span></button><button className="video-action icon-only" aria-label="More"><MoreHorizontal size={19} /></button></div>
      <div className="description-card"><strong>Explore this video</strong><p>Ask the AI assistant for a summary, a specific detail, or the key takeaways from the transcript.</p></div>
      {error && <div className="transcript-error"><AlertCircle size={19} /><span>{error}</span><button onClick={() => window.location.reload()} aria-label="Retry processing"><RotateCcw size={16} /></button></div>}
    </section>

    <aside className="chat-section">
      <div className="chat-header"><div className="assistant-mark"><Sparkles size={17} /></div><div className="assistant-heading"><h2>Ask about this video</h2><span>AI-powered video companion</span></div><button className="icon-button chat-close" aria-label="Close assistant"><X size={18} /></button></div>
      <div className="assistant-context"><span className={`status-dot ${isProcessing ? 'busy' : ''}`} />{isProcessing ? 'Reading video transcript…' : error ? 'Transcript unavailable' : 'Ready to answer from this video'}</div>
      <div className="chat-messages">
        {messages.length === 1 && !isProcessing && !error && <div className="prompt-intro"><div className="prompt-orb"><Sparkles size={23} /></div><h3>What would you like to know?</h3><p>Ask a question about the video, or try one of these.</p><div className="suggested-prompts"><button onClick={() => askPrompt('Give me a quick summary of this video')}>Give me a quick summary <span>→</span></button><button onClick={() => askPrompt('What are the key takeaways?')}>What are the key takeaways? <span>→</span></button><button onClick={() => askPrompt('What is the most important idea?')}>What’s the main idea? <span>→</span></button></div></div>}
        {messages.map((msg) => <div key={msg.id} className={`message ${msg.sender} ${msg.loading ? 'message-loading' : ''}`}>{msg.loading ? <div className="loading"><Sparkles size={15} /><span>Thinking</span><i className="dot" /><i className="dot" /><i className="dot" /></div> : <p>{msg.text}</p>}</div>)}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-container" onSubmit={handleSendMessage}><p className="input-hint">{isProcessing ? 'Your assistant will be ready in a moment' : 'Ask anything about what’s in this video'}</p><div className="chat-form"><input type="text" className="chat-input" placeholder={isProcessing ? 'Preparing assistant…' : 'Ask a question'} value={input} onChange={(e) => setInput(e.target.value)} disabled={isProcessing || Boolean(error)} /><button type="submit" className="chat-submit" aria-label="Send message" disabled={!input.trim() || isProcessing || isSending || Boolean(error)}><Send size={18} /></button></div><div className="powered-note"><Sparkles size={12} /> Answers are based on the video transcript</div></form>
    </aside>
  </div>;
};

export default VideoDetail;
