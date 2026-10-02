import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Bell, Compass, History, Home as HomeIcon, Menu, Mic, PlaySquare, Search, ThumbsUp, Video } from 'lucide-react';
import Home from './pages/Home';
import VideoDetail from './pages/VideoDetail';
import './index.css';

function AppLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const isVideoPage = location.pathname.startsWith('/video/');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) window.dispatchEvent(new CustomEvent('search', { detail: searchQuery.trim() }));
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="nav-leading">
          <button className="icon-button menu-button" aria-label="Menu"><Menu size={22} /></button>
          <Link to="/" className="logo" aria-label="AI TubeChat home">
            <span className="youtube-mark"><Video size={24} fill="currentColor" /></span>
            <span className="logo-word">YouTube</span><span className="logo-ai">AI</span>
          </Link>
        </div>
        <form className="search-area" onSubmit={handleSearch}>
          <div className="search-bar"><input aria-label="Search" type="search" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /><button className="search-submit" type="submit" aria-label="Search"><Search size={20} /></button></div>
          <button type="button" className="icon-button voice-search" aria-label="Voice search"><Mic size={20} /></button>
        </form>
        <div className="nav-actions"><button className="icon-button create-button" aria-label="Create"><Video size={20} /></button><button className="icon-button" aria-label="Notifications"><Bell size={20} /></button><div className="profile-avatar">A</div></div>
      </header>

      {!isVideoPage && <aside className="sidebar">
        <nav className="side-nav" aria-label="Main navigation">
          <Link to="/" className="side-link active"><HomeIcon size={21} /><span>Home</span></Link>
          <a href="#explore" className="side-link"><Compass size={21} /><span>Explore</span></a>
          <a href="#shorts" className="side-link"><PlaySquare size={21} /><span>Shorts</span></a>
          <div className="side-divider" />
          <a href="#history" className="side-link"><History size={21} /><span>History</span></a>
          <a href="#liked" className="side-link"><ThumbsUp size={21} /><span>Liked videos</span></a>
        </nav>
        <div className="sidebar-note"><span className="note-sparkle">✦</span><strong>Video, meet AI</strong><p>Open any video to ask questions and get a quick summary.</p></div>
      </aside>}

      <main className={`main-content ${isVideoPage ? 'video-route' : ''}`}>
        <Routes><Route path="/" element={<Home />} /><Route path="/video/:id" element={<VideoDetail />} /></Routes>
      </main>
    </div>
  );
}

function App() { return <Router><AppLayout /></Router>; }
export default App;
