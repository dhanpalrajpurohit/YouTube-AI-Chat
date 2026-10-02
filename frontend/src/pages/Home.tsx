import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MoreVertical } from 'lucide-react';

interface VideoItem {
  id: { videoId: string };
  snippet: { title: string; channelTitle: string; publishedAt?: string; thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } } };
}

const categories = ['All', 'Music', 'Live', 'Gaming', 'News', 'Podcasts', 'Programming', 'Recently uploaded', 'Watched'];

const Home = () => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All');

  const fetchVideos = useCallback(async (query: string) => {
    setLoading(true); setError('');
    try {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey || apiKey === 'your_youtube_api_key_here') throw new Error('missing-key');
      const params = new URLSearchParams({ part: 'snippet', maxResults: '24', q: query, type: 'video', key: apiKey });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.items)) throw new Error(data.error?.message || 'Could not load videos. Please try again.');
      setVideos(data.items);
    } catch (err) {
      setError(err instanceof Error && err.message === 'missing-key' ? 'Add your YouTube API key to the VITE_YOUTUBE_API_KEY environment variable to load videos.' : err instanceof Error ? err.message : 'Something went wrong while loading videos.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchVideos('technology');
    const handleSearch = (e: Event) => { const event = e as CustomEvent<string>; setCategory('All'); fetchVideos(event.detail); };
    window.addEventListener('search', handleSearch);
    return () => window.removeEventListener('search', handleSearch);
  }, [fetchVideos]);

  return <div className="home-page">
    <div className="category-bar" aria-label="Video categories">
      {categories.map((item) => <button key={item} className={`category-chip ${category === item ? 'selected' : ''}`} onClick={() => { setCategory(item); if (item !== 'All') fetchVideos(item); else fetchVideos('technology'); }}>{item}</button>)}
    </div>
    {loading ? <div className="video-grid skeleton-grid" aria-label="Loading videos">{Array.from({ length: 8 }, (_, i) => <div className="video-skeleton" key={i}><div className="skeleton-thumb" /><div className="skeleton-meta"><i /><i /><i /></div></div>)}</div> : error ? <div className="empty-state"><div className="empty-icon">!</div><h2>Videos aren’t available yet</h2><p>{error}</p><button className="retry-button" onClick={() => fetchVideos('technology')}>Try again</button></div> : <div className="video-grid">
      {videos.map((video) => {
        const thumbnail = video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url;
        return <Link to={`/video/${video.id.videoId}`} key={video.id.videoId} className="video-card">
          <div className="thumbnail-container"><img src={thumbnail} alt="" className="thumbnail" loading="lazy" /><span className="duration">Watch</span></div>
          <div className="video-info"><div className="channel-avatar">{video.snippet.channelTitle.charAt(0)}</div><div className="video-copy"><h3 className="video-title" dangerouslySetInnerHTML={{ __html: video.snippet.title }} /><p className="video-channel">{video.snippet.channelTitle}<CheckCircle2 size={13} /></p><p className="video-meta">Recommended for you</p></div><button className="card-more" aria-label="More options" onClick={(e) => e.preventDefault()}><MoreVertical size={19} /></button></div>
        </Link>;
      })}
    </div>}
  </div>;
};

export default Home;
