import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NoteRepository } from '@/database/repositories/NoteRepository';
import type { NoteListItem, SearchScope } from '@/types/models';
import './SearchPage.css';

export function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [results, setResults] = useState<NoteListItem[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length === 0) {
        setResults([]);
        return;
      }
      
      const res = await NoteRepository.search(query, scope);
      setResults(res);
    };
    
    // Add a small debounce
    const timer = setTimeout(() => {
      fetchResults();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query, scope]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="highlight">{part}</span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const handleItemClick = (item: NoteListItem) => {
    if (item.eventId) {
      navigate(`/event/${item.eventId}`);
      return;
    }
    const path = item.type === 'checklist' ? 'checklist' : 'note';
    navigate(`/${path}/${item.id}`);
  };

  return (
    <div className="search-page">
      <div className="search-container">
        
        {/* Desktop Header */}
        <header className="search-header desktop-only">
          <h1 className="search-title">Search</h1>
        </header>

        <div className="search-input-wrapper">
          <span className="material-symbols-outlined search-icon">search</span>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search notes, events..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query.length > 0 && (
            <button className="clear-btn" onClick={() => setQuery('')}>
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        <div className="scope-chips">
          {(['all', 'titles', 'contents'] as SearchScope[]).map(s => (
            <button 
              key={s}
              className={`chip ${scope === s ? 'active' : ''}`}
              onClick={() => setScope(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {query.trim().length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <span className="material-symbols-outlined empty-icon">search</span>
            </div>
            <h3>Find anything</h3>
            <p>Find anything across your notes. Start typing to see results.</p>
          </div>
        ) : (
          <div className="results-state">
            <p className="results-label">
              {results.length > 0 ? 'Recent matches' : `No results found for '${query}'`}
            </p>
            
            <div className="results-list">
              {results.map(item => (
                <div 
                  key={item.id} 
                  className="result-card"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="result-header">
                    <div className="result-title-group">
                      {item.eventId && (
                        <span className="material-symbols-outlined item-icon event">event</span>
                      )}
                      <h4 className="result-title">{highlightText(item.title || 'Untitled', query)}</h4>
                    </div>
                    <span className="result-date">
                      {new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  {item.snippet && (
                    <p className="result-snippet">
                      {highlightText(item.snippet, query)}
                    </p>
                  )}
                  
                  {item.type === 'checklist' && item.checklistTotal !== undefined && (
                    <div className="result-meta">
                       <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>checklist</span>
                       <span>{item.checklistCompleted}/{item.checklistTotal}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
