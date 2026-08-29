import { useState, useEffect, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { NoteRepository } from '@/database/repositories/NoteRepository';
import { EventRepository } from '@/database/repositories/EventRepository';
import type { Note, NoteColor } from '@/types/models';
import { SelectFolderModal } from '@/components/modals/SelectFolderModal';
import './TextNoteEditorPage.css';

export function TextNoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const [note, setNote] = useState<Note | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start typing...' }),
    ],
    content: '',
  });

  useEffect(() => {
    if (id && id !== 'new') {
      NoteRepository.getById(id).then(loadedNote => {
        if (loadedNote) {
          setNote(loadedNote);
          setTitle(loadedNote.title);
          setColor(loadedNote.color);
          setFolderId(loadedNote.folderId);
          editor?.commands.setContent(loadedNote.content);
        }
      });
    }
  }, [id, editor]);

  const handleSave = async () => {
    const content = editor?.getHTML() || '';
    if (note) {
      await NoteRepository.update(note.id, { title, content, color, folderId });
    } else {
      await NoteRepository.create({ title, content, color, type: 'text', folderId, eventId: null });
    }
    navigate(-1);
  };

  const handleDelete = async () => {
    if (note) {
      await NoteRepository.remove(note.id);
    }
    navigate(-1);
  };

  const handleConvertToEvent = async () => {
    const plainText = editor?.getText() || '';
    let currentNote = note;
    if (!currentNote) {
      const content = editor?.getHTML() || '';
      currentNote = await NoteRepository.create({
        title: title || 'Untitled Note',
        content,
        color,
        type: 'text',
        folderId,
        eventId: null,
      });
      setNote(currentNote);
    }

    const createdEvent = await EventRepository.create({
      title: title || 'Untitled Note',
      startDate: new Date().toISOString(),
      endDate: null,
      allDay: false,
      reminder: '10min',
      description: plainText,
      links: JSON.stringify([]),
      color,
      folderId,
    });

    await NoteRepository.update(currentNote.id, { eventId: createdEvent.id });
    navigate(`/event/${createdEvent.id}`);
  };

  const wordCount = editor?.state.doc.textContent.trim().split(/\s+/).filter(Boolean).length || 0;
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Now';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const colorOptions: NoteColor[] = ['default', 'red', 'orange', 'teal', 'purple', 'blue'];
  const colorMap: Record<NoteColor, string> = {
    default: 'bg-surface-container-high',
    red: 'bg-[#ffb4ab]',
    orange: 'bg-[#ffb783]',
    teal: 'bg-[#4fdbc8]',
    purple: 'bg-[#c0c1ff]',
    blue: 'bg-[#8083ff]'
  };

  return (
    <div className="bg-background text-on-background h-screen flex flex-col font-body-md overflow-hidden antialiased">
      <header className="flex justify-between items-center px-margin-mobile w-full h-16 bg-background z-10 shrink-0 border-b border-outline-variant/20 relative">
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(-1)} aria-label="Go back" className="text-on-surface-variant hover:bg-surface-container transition-colors duration-200 rounded-full p-2 -ml-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
        <div className="flex items-center gap-sm">
          <button onClick={handleSave} aria-label="Save note" className="text-primary hover:bg-surface-container transition-colors duration-200 rounded-full p-2">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label="More options" className="text-on-surface-variant hover:bg-surface-container transition-colors duration-200 rounded-full p-2">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface-container rounded-lg shadow-lg py-1 z-50">
                <button onClick={() => { setIsFolderModalOpen(true); setMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-surface-container-highest flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">folder</span>
                  Move to Folder
                </button>
                <button onClick={() => { handleConvertToEvent(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-surface-container-highest flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">event</span>
                  Convert to Event
                </button>
                <button onClick={handleDelete} className="w-full text-left px-4 py-2 hover:bg-surface-container-highest text-error flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Delete Note
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-y-auto px-margin-mobile md:px-margin-desktop py-lg max-w-[800px] w-full mx-auto hide-scrollbar">
        <div className="flex gap-sm mb-lg animate-fade-in-up">
          {colorOptions.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full ${colorMap[c]} border-2 ${color === c ? 'border-primary' : 'border-transparent'} transition-all`}></button>
          ))}
        </div>

        <div className="mb-md">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-transparent border-none p-0 m-0 font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg font-bold text-on-background focus:ring-0 placeholder:text-on-surface-variant/50"
            placeholder="Note title..."
            type="text"
          />
        </div>

        <div className="flex items-center gap-xs text-on-surface-variant font-label-sm text-label-sm mb-xl cursor-pointer" onClick={() => setIsFolderModalOpen(true)}>
          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
          <span>{formatDate(note?.createdAt)}</span>
          <span className="mx-2">•</span>
          <span>{wordCount} words</span>
        </div>

        <div className="flex-1 w-full font-body-lg text-body-lg text-on-surface">
          <EditorContent editor={editor} />
        </div>

        <div className="h-20 shrink-0"></div>
      </main>

      {editor && (
        <div className="fixed bottom-0 w-full bg-surface-container-low border-t border-outline-variant/20 py-2 px-margin-mobile flex justify-center items-center h-16 z-20 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
          <div className="flex gap-xs bg-surface-container p-1 rounded-full">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-highest transition-colors font-bold ${editor.isActive('bold') ? 'text-primary bg-primary-container/20' : 'text-on-surface'}`}>
              <span className="material-symbols-outlined">format_bold</span>
            </button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-highest transition-colors italic ${editor.isActive('italic') ? 'text-primary bg-primary-container/20' : 'text-on-surface'}`}>
              <span className="material-symbols-outlined">format_italic</span>
            </button>
            <div className="w-px h-6 bg-outline-variant/50 self-center mx-1"></div>
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-highest transition-colors ${editor.isActive('bulletList') ? 'text-primary bg-primary-container/20' : 'text-on-surface'}`}>
              <span className="material-symbols-outlined">format_list_bulleted</span>
            </button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${editor.isActive('orderedList') ? 'text-primary bg-primary-container/20' : 'text-on-surface hover:bg-surface-container-highest'}`}>
              <span className="material-symbols-outlined">format_list_numbered</span>
            </button>
            <div className="w-px h-6 bg-outline-variant/50 self-center mx-1"></div>
            <button onClick={() => {
              const url = window.prompt('URL');
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }} className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined">link</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined">attach_file</span>
            </button>
          </div>
        </div>
      )}

      <SelectFolderModal 
        isOpen={isFolderModalOpen} 
        onClose={() => setIsFolderModalOpen(false)} 
        onSelect={(fid) => { setFolderId(fid); setIsFolderModalOpen(false); }}
        currentFolderId={folderId}
      />
    </div>
  );
}
