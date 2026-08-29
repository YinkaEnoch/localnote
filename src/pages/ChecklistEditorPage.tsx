import React, { useState, useEffect, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useNavigate, useParams } from 'react-router-dom';
import { NoteRepository } from '@/database/repositories/NoteRepository';
import { ChecklistRepository } from '@/database/repositories/ChecklistRepository';
import type { Note, ChecklistItem, NoteColor } from '@/types/models';
import { SelectFolderModal } from '@/components/modals/SelectFolderModal';

export function ChecklistEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsMenuOpen(false), isMenuOpen);
  const newItemInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isNew && id) {
      loadData(id);
    }
  }, [id, isNew]);

  const loadData = async (noteId: string) => {
    try {
      const n = await NoteRepository.getById(noteId);
      if (n) {
        setNote(n);
        setTitle(n.title);
        setColor(n.color);
        setFolderId(n.folderId);
        const checklistItems = await ChecklistRepository.getByNoteId(noteId);
        setItems(checklistItems);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const ensureNoteExists = async (): Promise<Note> => {
    if (note) {
      const updated = await NoteRepository.update(note.id, {
        title: title || 'Untitled Checklist',
        color,
        folderId,
      });
      setNote(updated);
      return updated;
    }
    const created = await NoteRepository.create({
      title: title || 'Untitled Checklist',
      content: '',
      type: 'checklist',
      color,
      folderId,
      eventId: null,
    });
    setNote(created);
    return created;
  };

  const handleSave = async () => {
    await ensureNoteExists();
    navigate(-1);
  };

  const handleAddItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemText.trim()) return;

    try {
      const currentNote = await ensureNoteExists();
      const sortOrder = items.length;
      const createdItem = await ChecklistRepository.create({
        noteId: currentNote.id,
        text: newItemText.trim(),
        isCompleted: false,
        sortOrder,
      });
      setItems(prev => [...prev, createdItem]);
      setNewItemText('');
      newItemInputRef.current?.focus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
    try {
      const updated = await ChecklistRepository.update(itemId, {
        isCompleted: !currentStatus,
      });
      setItems(prev => prev.map(item => item.id === itemId ? updated : item));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateItemText = async (itemId: string, text: string) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, text } : item));
    try {
      await ChecklistRepository.update(itemId, { text });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await ChecklistRepository.remove(itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async () => {
    if (note && window.confirm('Delete this checklist?')) {
      await NoteRepository.remove(note.id);
      navigate('/', { replace: true });
    }
  };

  const colorOptions: NoteColor[] = ['default', 'orange', 'teal', 'red', 'purple', 'blue'];
  const colorBgMap: Record<NoteColor, string> = {
    default: 'bg-surface-container-high',
    orange: 'bg-tertiary',
    teal: 'bg-secondary',
    red: 'bg-error',
    purple: 'bg-primary',
    blue: 'bg-primary-container',
  };

  const activeItems = items.filter(i => !i.isCompleted);
  const completedItems = items.filter(i => i.isCompleted);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Today';
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md overflow-hidden">
      {/* Top App Bar */}
      <header className="flex justify-between items-center px-margin-mobile w-full h-16 bg-background text-primary font-headline-md shrink-0 border-b border-outline-variant/20">
        <button
          aria-label="Go back"
          className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors duration-200 text-on-background focus:outline-none focus:ring-2 focus:ring-primary"
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            aria-label="Save checklist"
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors duration-200 text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={handleSave}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              aria-label="More options"
              className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors duration-200 text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface-container rounded-lg shadow-lg py-1 z-50 text-base">
                <button
                  className="w-full text-left px-4 py-2 hover:bg-surface-container-highest flex items-center gap-2"
                  onClick={() => { setIsFolderModalOpen(true); setIsMenuOpen(false); }}
                >
                  <span className="material-symbols-outlined text-[18px]">folder</span>
                  Move to Folder
                </button>
                {note && (
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-surface-container-highest text-error flex items-center gap-2"
                    onClick={handleDeleteNote}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Delete Checklist
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex justify-center w-full overflow-y-auto px-margin-mobile pb-32">
        <div className="w-full max-w-[800px] flex flex-col gap-lg mt-md">
          {/* Header Section */}
          <section className="flex flex-col gap-unit">
            <input
              aria-label="Checklist Title"
              className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 font-display-lg-mobile md:font-display-lg text-on-background placeholder:text-on-surface-variant font-bold"
              placeholder="Checklist Title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex items-center justify-between mt-sm">
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {formatDate(note?.createdAt)} • {items.length} items • {completedItems.length} completed
              </p>
              {/* Color Dot Selector */}
              <div className="flex gap-2">
                {colorOptions.map(c => (
                  <button
                    key={c}
                    aria-label={`${c} color`}
                    className={`w-6 h-6 rounded-full ${colorBgMap[c]} border-2 ${color === c ? 'border-primary' : 'border-transparent'} transition-all`}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </section>

          <hr className="border-outline-variant opacity-30 my-xs" />

          {/* Checklist Items */}
          <section className="flex flex-col gap-xs">
            {/* Active Items */}
            {activeItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-md group p-unit hover:bg-surface-container rounded-lg transition-colors"
              >
                <button
                  aria-label="Check item"
                  className="w-6 h-6 rounded-full border-2 border-outline flex items-center justify-center cursor-pointer transition-all hover:border-primary shrink-0"
                  onClick={() => handleToggleItem(item.id, item.isCompleted)}
                />
                <input
                  aria-label="Checklist item"
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 font-body-md text-on-background"
                  type="text"
                  value={item.text}
                  onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      newItemInputRef.current?.focus();
                    }
                  }}
                />
                <button
                  aria-label="Delete item"
                  className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-container-high text-error"
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            ))}

            {/* Add Item Row */}
            <form onSubmit={handleAddItem} className="flex items-center gap-md p-unit mt-sm border-t border-surface-container-high pt-md">
              <div className="w-6 flex justify-center text-primary shrink-0">
                <span className="material-symbols-outlined">add</span>
              </div>
              <input
                ref={newItemInputRef}
                aria-label="Add new checklist item"
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 font-body-md text-on-background placeholder:text-on-surface-variant"
                placeholder="Add item..."
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
              />
              {newItemText.trim().length > 0 && (
                <button type="submit" className="text-primary text-label-sm font-medium px-2 py-1">
                  Add
                </button>
              )}
            </form>

            {/* Completed Items */}
            {completedItems.length > 0 && (
              <>
                <div className="mt-md mb-xs">
                  <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider pl-8">
                    Completed ({completedItems.length})
                  </h3>
                </div>
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-md group p-unit hover:bg-surface-container rounded-lg transition-colors opacity-70"
                  >
                    <button
                      aria-label="Uncheck item"
                      className="w-6 h-6 rounded-full bg-primary border-2 border-primary flex items-center justify-center cursor-pointer shrink-0"
                      onClick={() => handleToggleItem(item.id, item.isCompleted)}
                    >
                      <span className="material-symbols-outlined text-[16px] text-on-primary" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                    </button>
                    <input
                      aria-label="Checklist item"
                      className="flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 font-body-md text-on-surface-variant line-through"
                      type="text"
                      value={item.text}
                      onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                    />
                    <button
                      aria-label="Delete item"
                      className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-container-high text-error"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                ))}
              </>
            )}
          </section>
        </div>
      </main>

      {/* Select Folder Modal */}
      <SelectFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSelect={(fid) => {
          setFolderId(fid);
          setIsFolderModalOpen(false);
        }}
        currentFolderId={folderId}
      />
    </div>
  );
}

