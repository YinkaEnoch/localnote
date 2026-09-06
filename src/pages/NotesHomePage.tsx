import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderRepository } from '@/database/repositories/FolderRepository';
import { NoteRepository } from '@/database/repositories/NoteRepository';
import { useDrawer } from '@/components/layout/DrawerContext';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { cancelNoteReminder } from '@/services/reminderService';
import { NOTE_COLOR_VAR, FOLDER_COLOR_VAR } from '@/theme/colors';
import type { FolderWithCount, NoteListItem, SortOption } from '@/types/models';
import './NotesHomePage.css';

/** How long a press must be held before multi-select mode activates. */
const LONG_PRESS_MS = 500;

export function NotesHomePage() {
  const navigate = useNavigate();
  const openDrawer = useDrawer();
  const [folders, setFolders] = useState<FolderWithCount[]>([]);
  const [items, setItems] = useState<NoteListItem[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

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

  // Cancel any pending long-press when the component unmounts.
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const enterSelectionMode = (itemId: string) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([itemId]));
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  /** Long-press (touch or mouse) starts selection mode with the pressed item. */
  const handleItemPressStart = (itemId: string) => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (!isSelectionMode) enterSelectionMode(itemId);
    }, LONG_PRESS_MS);
  };

  const handleItemPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleItemClick = (itemId: string, path: string) => {
    // Swallow the click that terminates a long-press so it doesn't navigate.
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (isSelectionMode) {
      toggleItemSelection(itemId);
    } else {
      navigate(path);
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      // Cancel any scheduled OS notifications first.
      for (const noteId of ids) {
        try {
          await cancelNoteReminder(noteId);
        } catch (err) {
          console.error('[NotesHome] reminder cancel failed:', err);
        }
      }
      // IMPORTANT: remove() opens a manual BEGIN TRANSACTION on the shared
      // connection, so the deletes MUST run sequentially — parallel deletes
      // ("cannot start a transaction within a transaction") all roll back.
      for (const noteId of ids) {
        await NoteRepository.remove(noteId);
      }
      exitSelectionMode();
      await loadData();
    } catch (e) {
      console.error('[NotesHome] bulk delete failed:', e);
      // Reload so the UI reflects whatever actually persisted; stay in
      // selection mode so the user can retry the remainder.
      await loadData();
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

    const isSelected = selectedIds.has(item.id);

    return (
      <React.Fragment key={item.id}>
        <div
          className={`list-item ${isSelectionMode ? 'selection-mode' : ''} ${isSelected ? 'selected' : ''}`}
          onPointerDown={() => handleItemPressStart(item.id)}
          onPointerUp={handleItemPressEnd}
          onPointerLeave={handleItemPressEnd}
          onPointerCancel={handleItemPressEnd}
          onContextMenu={(e) => { if (isSelectionMode || longPressFired.current) e.preventDefault(); }}
          onClick={() => handleItemClick(item.id, path)}
        >
          {isSelectionMode && (
            <span
              className="list-item-checkbox"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {isSelected ? 'check' : ''}
              </span>
            </span>
          )}
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
        {isSelectionMode ? (
          <>
            <button className="top-bar-icon-button left" onClick={exitSelectionMode} aria-label="Exit selection mode">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="top-bar-title">{selectedIds.size} selected</div>
            <button
              className="top-bar-icon-button right"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={selectedIds.size === 0}
              aria-label="Delete selected items"
              style={selectedIds.size === 0 ? { opacity: 0.4, pointerEvents: 'none' } : { color: 'var(--color-error)' }}
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
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

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'item' : 'items'}?`}
        message="The selected notes and checklists will be permanently removed, including their checklist items and reminders. This action cannot be undone."
        confirmText="Delete"
        destructive
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          handleDeleteSelected();
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
