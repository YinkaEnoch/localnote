import { useState, useEffect, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { EventRepository } from '@/database/repositories/EventRepository';
import { FolderRepository } from '@/database/repositories/FolderRepository';
import { NoteRepository } from '@/database/repositories/NoteRepository';
import type { Event, NoteColor, ReminderOffset } from '@/types/models';
import { SelectFolderModal } from '@/components/modals/SelectFolderModal';

export function EventEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const [allDay, setAllDay] = useState(false);
  
  // Format initial ISO date or from route state
  const initialDateStr = (location.state as any)?.date || new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(`${initialDateStr}T09:00`);
  const [endDate, setEndDate] = useState(`${initialDateStr}T10:00`);
  
  const [reminder, setReminder] = useState<ReminderOffset>('10min');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>('');
  
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isReminderMenuOpen, setIsReminderMenuOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reminderMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsMenuOpen(false), isMenuOpen);
  useClickOutside(reminderMenuRef, () => setIsReminderMenuOpen(false), isReminderMenuOpen);

  useEffect(() => {
    if (!isNew && id) {
      loadData(id);
    }
  }, [id, isNew]);

  useEffect(() => {
    if (folderId) {
      FolderRepository.getById(folderId).then(f => {
        setFolderName(f?.name || '');
      });
    } else {
      setFolderName('');
    }
  }, [folderId]);

  const loadData = async (eventId: string) => {
    try {
      const e = await EventRepository.getById(eventId);
      if (e) {
        setEvent(e);
        setTitle(e.title);
        setColor(e.color);
        setAllDay(e.allDay);
        setStartDate(e.startDate.slice(0, 16));
        setEndDate(e.endDate ? e.endDate.slice(0, 16) : `${e.startDate.slice(0, 10)}T10:00`);
        setReminder(e.reminder);
        setDescription(e.description || '');
        setFolderId(e.folderId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!title.trim() && !description.trim()) {
      navigate(-1);
      return;
    }

    const payload = {
      title: title.trim() || 'Untitled Event',
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      allDay,
      reminder,
      description,
      links: JSON.stringify([]),
      color,
      folderId,
    };

    try {
      if (!isNew && id) {
        await EventRepository.update(id, payload);
      } else {
        await EventRepository.create(payload);
      }
      navigate(-1);
    } catch (err) {
      console.error('Failed to save event:', err);
    }
  };

  const handleDelete = async () => {
    if (event && window.confirm('Are you sure you want to delete this event?')) {
      await EventRepository.remove(event.id);
      navigate(-1);
    }
  };

  const handleConvertToNote = async () => {
    if (!event) return;
    try {
      const note = await NoteRepository.create({
        title: title || 'Untitled Note',
        content: description ? `<p>${description.replace(/\n/g, '<br/>')}</p>` : '',
        type: 'text',
        color,
        folderId,
        eventId: event.id,
      });
      navigate(`/note/${note.id}`);
    } catch (err) {
      console.error('Failed to convert event to note:', err);
    }
  };

  const colorOptions: NoteColor[] = ['default', 'red', 'orange', 'teal', 'purple', 'blue'];
  const colorBgMap: Record<NoteColor, string> = {
    default: 'bg-surface-container',
    red: 'bg-error',
    orange: 'bg-tertiary',
    teal: 'bg-secondary',
    purple: 'bg-primary',
    blue: 'bg-inverse-primary',
  };

  const reminderLabels: Record<ReminderOffset, string> = {
    none: 'None',
    '5min': '5 minutes before',
    '10min': '10 minutes before',
    '15min': '15 minutes before',
    '30min': '30 minutes before',
    '1hr': '1 hour before',
    '1day': '1 day before',
  };

  const formatDateLabel = (isoDateStr: string) => {
    if (!isoDateStr) return '';
    const d = new Date(isoDateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimeLabel = (isoDateStr: string) => {
    if (!isoDateStr) return '';
    const d = new Date(isoDateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased font-body-md">
      {/* Top App Bar */}
      <header className="flex justify-between items-center px-margin-mobile w-full h-16 bg-background text-primary font-headline-md top-0 sticky z-10 border-b border-outline-variant/20">
        <button
          aria-label="Go back"
          className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors duration-200 text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="font-headline-md text-headline-md font-bold text-on-background flex-1 text-center">
          {isNew ? 'New Event' : 'Edit Event'}
        </span>
        <div className="flex items-center gap-2">
          <button
            aria-label="Save event"
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
              <div className="absolute right-0 mt-2 w-48 bg-surface-container rounded-lg shadow-lg py-1 z-50">
                <button
                  className="w-full text-left px-4 py-2 hover:bg-surface-container-highest flex items-center gap-2"
                  onClick={() => { setIsFolderModalOpen(true); setIsMenuOpen(false); }}
                >
                  <span className="material-symbols-outlined text-[18px]">folder</span>
                  Move to Folder
                </button>
                {!isNew && (
                  <>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-surface-container-highest flex items-center gap-2"
                      onClick={() => { handleConvertToNote(); setIsMenuOpen(false); }}
                    >
                      <span className="material-symbols-outlined text-[18px]">description</span>
                      Convert to Note
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-surface-container-highest text-error flex items-center gap-2"
                      onClick={handleDelete}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Delete Event
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-[800px] mx-auto px-margin-mobile pb-xxl flex flex-col gap-lg mt-md">
        {/* Title Input */}
        <input
          className="w-full bg-transparent border-none p-0 font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-background placeholder:text-on-surface-variant focus:ring-0 focus:outline-none font-bold"
          placeholder="Event title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Color Selector */}
        <div className="flex items-center gap-md py-sm">
          {colorOptions.map(c => (
            <button
              key={c}
              className={`w-8 h-8 rounded-full ${colorBgMap[c]} border-2 ${color === c ? 'border-primary' : 'border-transparent'} flex items-center justify-center shrink-0 transition-all`}
              onClick={() => setColor(c)}
              aria-label={`Select ${c} color`}
            >
              {color === c && (
                <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  circle
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="h-px w-full bg-surface-variant" />

        {/* Date & Time Section */}
        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-between py-sm cursor-pointer" onClick={() => setAllDay(!allDay)}>
            <div className="flex items-center gap-md text-on-background">
              <span className="material-symbols-outlined text-on-surface-variant">schedule</span>
              <span className="font-body-lg text-body-lg">All-day</span>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              aria-pressed={allDay}
              className={`w-14 h-8 rounded-full p-1 flex items-center transition-colors duration-300 relative ${
                allDay ? 'bg-primary' : 'bg-surface-variant'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setAllDay(!allDay);
              }}
            >
              <div
                className={`w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${
                  allDay ? 'translate-x-6 bg-on-primary' : 'translate-x-0 bg-outline'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            {/* Start Date/Time */}
            <div className="flex flex-col items-start p-md rounded-xl bg-surface-container-low focus-within:ring-2 focus-within:ring-primary w-full text-left">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Starts</span>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                className="w-full bg-transparent border-none p-0 font-body-md text-on-background font-medium focus:ring-0"
                value={allDay ? startDate.slice(0, 10) : startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(allDay ? `${val}T09:00` : val);
                }}
              />
              <span className="font-label-sm text-on-surface-variant/80 mt-1">
                {formatDateLabel(startDate)} {!allDay && `• ${formatTimeLabel(startDate)}`}
              </span>
            </div>

            {/* End Date/Time */}
            <div className="flex flex-col items-start p-md rounded-xl bg-surface-container-low focus-within:ring-2 focus-within:ring-primary w-full text-left">
              <span className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Ends</span>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                className="w-full bg-transparent border-none p-0 font-body-md text-on-background font-medium focus:ring-0"
                value={allDay ? endDate.slice(0, 10) : endDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setEndDate(allDay ? `${val}T10:00` : val);
                }}
              />
              <span className="font-label-sm text-on-surface-variant/80 mt-1">
                {formatDateLabel(endDate)} {!allDay && `• ${formatTimeLabel(endDate)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-surface-variant" />

        {/* Reminder Section */}
        <div className="relative" ref={reminderMenuRef}>
          <button
            type="button"
            className="flex items-center gap-md py-md text-left w-full hover:bg-surface-container-low rounded-lg transition-colors group px-2"
            onClick={() => setIsReminderMenuOpen(!isReminderMenuOpen)}
          >
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <div className="flex-1">
              <span className="block font-body-md text-body-md text-on-background">
                {reminderLabels[reminder]}
              </span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
          </button>

          {isReminderMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-surface-container-high rounded-xl shadow-xl py-2 z-40 border border-outline-variant/30">
              {(Object.keys(reminderLabels) as ReminderOffset[]).map((key) => (
                <button
                  key={key}
                  className={`w-full text-left px-4 py-2 hover:bg-surface-container-highest flex items-center justify-between text-body-md ${
                    reminder === key ? 'text-primary font-medium' : 'text-on-surface'
                  }`}
                  onClick={() => {
                    setReminder(key);
                    setIsReminderMenuOpen(false);
                  }}
                >
                  <span>{reminderLabels[key]}</span>
                  {reminder === key && <span className="material-symbols-outlined text-[18px]">check</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-px w-full bg-surface-variant" />

        {/* Description / Notes */}
        <div className="flex gap-md py-sm">
          <span className="material-symbols-outlined text-on-surface-variant pt-2">notes</span>
          <textarea
            className="w-full bg-transparent border-none p-0 pt-2 font-body-md text-body-md text-on-background placeholder:text-on-surface-variant focus:ring-0 focus:outline-none resize-none"
            placeholder="Add notes or description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="h-px w-full bg-surface-variant" />

        {/* Folder Association */}
        <button
          type="button"
          className="flex items-center gap-md py-md text-left hover:bg-surface-container-low rounded-lg transition-colors group px-2"
          onClick={() => setIsFolderModalOpen(true)}
        >
          <span className="material-symbols-outlined text-on-surface-variant">folder</span>
          <div className="flex-1">
            <span className={`block font-body-md text-body-md ${folderName ? 'text-on-background' : 'text-on-surface-variant'}`}>
              {folderName || 'Select folder'}
            </span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
        </button>
      </main>

      {/* Bottom Metadata & Toolbar Area */}
      <div className="mt-auto w-full border-t border-surface-variant bg-background">
        <div className="text-center py-sm">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {event?.createdAt ? `Created ${new Date(event.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Draft Event'}
          </span>
        </div>
        <div className="flex justify-around items-center h-16 px-gutter pb-safe w-full max-w-[800px] mx-auto text-base">
          {!isNew && (
            <>
              <button
                aria-label="Convert to Note"
                className="w-12 h-12 flex flex-col items-center justify-center text-on-surface-variant hover:text-on-background hover:bg-surface-container rounded-full transition-all duration-200"
                onClick={handleConvertToNote}
                title="Convert to Note"
              >
                <span className="material-symbols-outlined">description</span>
              </button>
              <button
                aria-label="Delete Event"
                className="w-12 h-12 flex flex-col items-center justify-center text-on-surface-variant hover:text-error hover:bg-surface-container rounded-full transition-all duration-200"
                onClick={handleDelete}
                title="Delete Event"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </>
          )}
        </div>
      </div>

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

