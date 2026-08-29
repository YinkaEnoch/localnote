import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderRepository } from '@/database/repositories/FolderRepository';
import { NoteRepository } from '@/database/repositories/NoteRepository';
import type { Folder, NoteListItem } from '@/types/models';
import './FolderPage.css';

export function FolderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [items, setItems] = useState<NoteListItem[]>([]);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (folderId: string) => {
    try {
      const f = await FolderRepository.getById(folderId);
      if (f) setFolder(f);
      const n = await NoteRepository.getByFolderId(folderId, 'updated');
      setItems(n);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!folder) {
    return <div className="folder-page" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  return (
    <div className="folder-page">
      <header className="fp-header-bar">
        <button className="fp-icon-btn" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <button className="fp-icon-btn" onClick={() => navigate(`/folder/${folder.id}/edit`)}>
          <span className="material-symbols-outlined">edit</span>
        </button>
      </header>
      
      <main className="fp-main">
        <div className="fp-folder-header">
          <div className="fp-folder-icon" style={{ backgroundColor: 'var(--color-primary-container)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-on-primary-container)' }}>
              folder
            </span>
          </div>
          <div>
            <h1 className="fp-folder-title">{folder.name}</h1>
            <p className="fp-folder-subtitle">{items.length} items • Last modified {folder.updatedAt ? formatTime(folder.updatedAt) : 'Never'}</p>
          </div>
        </div>

        <div className="fp-grid">
          {items.map(item => {
            const isChecklist = item.type === 'checklist';
            const isEvent = !!item.eventId;
            let path = `/note/${item.id}`;
            if (isChecklist) path = `/checklist/${item.id}`;
            if (isEvent) path = `/event/${item.eventId}`;
            
            const colorVar = isEvent ? 'var(--color-tertiary)' : isChecklist ? 'var(--color-secondary)' : 'var(--color-primary)';

            return (
              <div key={item.id} className="fp-card" onClick={() => navigate(path)}>
                <div className="fp-card-indicator" style={{ backgroundColor: colorVar }} />
                <div className="fp-card-header">
                  <span className="material-symbols-outlined icon" style={{ color: colorVar }}>
                    {isEvent ? 'event' : isChecklist ? 'checklist' : 'description'}
                  </span>
                  <span className="time">{formatTime(item.updatedAt)}</span>
                </div>
                <h3 className="fp-card-title">{item.title || 'Untitled'}</h3>
                
                {isChecklist ? (
                  <div className="fp-card-list">
                     <span className="fp-card-desc">{item.checklistCompleted || 0} of {item.checklistTotal || 0} completed</span>
                  </div>
                ) : isEvent ? (
                  <p className="fp-card-desc">Event date: {item.eventDate ? new Date(item.eventDate).toLocaleString() : 'TBD'}</p>
                ) : (
                  <p className="fp-card-desc">{item.snippet}</p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
