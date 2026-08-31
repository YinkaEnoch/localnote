import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderRepository } from '@/database/repositories/FolderRepository';
import { NoteRepository } from '@/database/repositories/NoteRepository';
import { useDrawer } from '@/components/layout/DrawerContext';
import { NOTE_COLOR_VAR, FOLDER_COLOR_VAR } from '@/theme/colors';
import type { FolderWithCount, NoteListItem, SortOption } from '@/types/models';
import './NotesHomePage.css';

export function NotesHomePage() {
  const navigate = useNavigate();
  const openDrawer = useDrawer();
  const [folders, setFolders] = useState<FolderWithCount[]>([]);
  const [items, setItems] = useState<NoteListItem[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [sortBy]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
      if (createRef.current && !createRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const f = await FolderRepository.getAll();
      const n = await NoteRepository.getAll(sortBy);
      setFolders(f);
      setItems(n);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = (item: NoteListItem, index: number) => {
    const isChecklist = item.type === 'checklist';
    const isEvent = !!item.eventId;
    const typeColorVar = `var(--color-${isEvent ? 'tertiary' : isChecklist ? 'secondary' : 'primary'}-container)`;
    const accentColor = NOTE_COLOR_VAR[item.color] || typeColorVar;

    let path = `/note/${item.id}`;
    if (isChecklist) path = `/checklist/${item.id}`;
    if (isEvent) path = `/event/${item.eventId}`;

    return (
      <React.Fragment key={item.id}>
        <div
          className="list-item"
          onClick={() => navigate(path)}
        >
          <div
            className="list-item-indicator"
            style={{ backgroundColor: accentColor }}
          />
          <div className="list-item-content">
            <div className="list-item-header">
              <h3 className="list-item-title">
                {item.title}
              </h3>
              <span className="list-item-time">{formatTime(item.updatedAt)}</span>
            </div>
            {isChecklist ? (
              <div className="list-item-badge" style={{ color: 'var(--color-secondary)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_box</span>
                <span>{item.checklistCompleted || 0}/{item.checklistTotal || 0} done</span>
              </div>
            ) : isEvent ? (
              <div className="list-item-badge" style={{ color: 'var(--color-tertiary)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>event</span>
                <span>{item.eventDate ? new Date(item.eventDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Event'}</span>
              </div>
            ) : (
              <p className="list-item-snippet">{item.snippet}</p>
            )}
          </div>
        </div>
        {index < items.length - 1 && <div className="list-divider" />}
      </React.Fragment>
    );
  };

  return (
    <div className="notes-home-page">
      <header className="top-bar">
        <button className="top-bar-icon-button left" onClick={openDrawer} aria-label="Open menu">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="top-bar-title">LocalNote</div>
        <div className="relative" ref={createRef}>
          <button className="top-bar-icon-button right" onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}>
            <span className="material-symbols-outlined">add</span>
          </button>
          {isCreateMenuOpen && (
            <div className="create-menu">
              <button onClick={() => navigate('/note/new')}><span className="material-symbols-outlined">description</span> Note</button>
              <button onClick={() => navigate('/checklist/new')}><span className="material-symbols-outlined">checklist</span> Checklist</button>
              <button onClick={() => navigate('/event/new')}><span className="material-symbols-outlined">event</span> Event</button>
              <button onClick={() => navigate('/folder/new')}><span className="material-symbols-outlined">folder</span> Folder</button>
            </div>
          )}
        </div>
      </header>
      <main className="main-content">
        <div className="header-controls">
          <span className="item-count">{items.length} Items</span>
          <div className="relative" ref={sortRef}>
            <button className="sort-button" onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}>
              <span className="label">Sort</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>sort</span>
            </button>
            {isSortMenuOpen && (
              <div className="sort-menu">
                <button onClick={() => { setSortBy('updated'); setIsSortMenuOpen(false); }}>Updated</button>
                <button onClick={() => { setSortBy('created'); setIsSortMenuOpen(false); }}>Created</button>
                <button onClick={() => { setSortBy('alphabetical'); setIsSortMenuOpen(false); }}>Alphabetical</button>
              </div>
            )}
          </div>
        </div>
        
        <section className="folders-section">
          <div className="folders-carousel">
            {folders.map(folder => (
              <div
                key={folder.id}
                className="folder-card"
                style={{ borderTopColor: FOLDER_COLOR_VAR[folder.color].bg }}
                onClick={() => navigate(`/folder/${folder.id}`)}
              >
                <span
                  className="material-symbols-outlined icon"
                  style={{ color: FOLDER_COLOR_VAR[folder.color].bg }}
                >
                  folder
                </span>
                <div>
                  <div className="name">{folder.name}</div>
                  <div className="count" style={{ color: FOLDER_COLOR_VAR[folder.color].bg }}>{folder.itemCount} items</div>
                </div>
              </div>
            ))}
            <div
              className="folder-card"
              style={{ borderTopColor: 'var(--color-outline)' }}
              onClick={() => navigate('/folder/new')}
            >
              <span className="material-symbols-outlined icon" style={{ color: 'var(--color-outline)' }}>add</span>
              <div>
                <div className="name" style={{ color: 'var(--color-outline)' }}>New Folder</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mixed-list">
          {items.length === 0 ? (
            <div className="empty-state">No items found. Create one to get started!</div>
          ) : (
            items.map((item, index) => renderItem(item, index))
          )}
        </section>
      </main>
    </div>
  );
}
