import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventRepository } from '@/database/repositories/EventRepository';
import { NoteRepository } from '@/database/repositories/NoteRepository';
import { ReminderRepository } from '@/database/repositories/ReminderRepository';
import type { Event, NoteListItem, Reminder } from '@/types/models';
import './CalendarPage.css';

export function CalendarPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [monthEvents, setMonthEvents] = useState<Event[]>([]);
  const [monthNotes, setMonthNotes] = useState<NoteListItem[]>([]);
  const [monthReminders, setMonthReminders] = useState<Reminder[]>([]);

  // Lookup maps for reminder parents (to resolve titles and note types).
  const [eventsMap, setEventsMap] = useState<Record<string, Event>>({});
  const [notesMap, setNotesMap] = useState<Record<string, NoteListItem>>({});

  useEffect(() => {
    const fetchMonthData = async () => {
      // In a real app we'd fetch just the month's data, 
      // but EventRepository doesn't have a getByMonth. We have getByDateRange.
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      // Pad the range by a day on each side: events are stored as UTC ISO
      // strings, so a local-time event can sit just outside the strict
      // month boundary in UTC.
      const rangeStart = new Date(year, month, 1);
      rangeStart.setDate(rangeStart.getDate() - 1);
      const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      const startDate = rangeStart.toISOString();
      const endDate = rangeEnd.toISOString();
      
      const events = await EventRepository.getByDateRange(startDate, endDate);
      const notes = await NoteRepository.getAll();
      const reminders = await ReminderRepository.getByDateRange(startDate, endDate);
      // Reminder parents may sit outside the displayed month (e.g. a recurring
      // event spanning months), so fetch all to resolve titles/types reliably.
      const allEvents = await EventRepository.getAll();

      setMonthEvents(events);
      setMonthNotes(notes);
      setMonthReminders(reminders);

      const eventsById: Record<string, Event> = {};
      for (const e of allEvents) eventsById[e.id] = e;
      setEventsMap(eventsById);

      const notesById: Record<string, NoteListItem> = {};
      for (const n of notes) notesById[n.id] = n;
      setNotesMap(notesById);
    };
    fetchMonthData();
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    
    // Previous month empty slots
    const firstDay = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Current month days
    const lastDate = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDate; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const formatDateString = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Events are stored as UTC ISO strings; compare them to the selected day
  // using LOCAL calendar dates (string-prefix matching breaks for any
  // timezone ahead of UTC — the event would appear on the wrong day).
  const isOnLocalDate = (isoString: string | undefined | null, date: Date): boolean => {
    if (!isoString) return false;
    const d = new Date(isoString);
    return (
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  };

  const selectedDateStr = formatDateString(selectedDate);
  const selectedEvents = monthEvents.filter(e => isOnLocalDate(e.startDate, selectedDate));
  const selectedNotes = monthNotes.filter(n => isOnLocalDate(n.eventDate, selectedDate));
  const selectedReminders = monthReminders.filter(r => isOnLocalDate(r.remindAt, selectedDate));

  // Resolve a reminder's parent and navigate to it (note/checklist/event).
  const openReminderParent = (id: string, parentType: 'note' | 'event') => {
    if (parentType === 'event') {
      navigate(`/event/${id}`);
    } else {
      const type = notesMap[id]?.type;
      navigate(`/${type === 'checklist' ? 'checklist' : 'note'}/${id}`);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const monthYearString = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const selectedFullDateString = selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="calendar-page">
      <div className="calendar-container">
        <div className="calendar-header">
          <h1 className="calendar-title">{monthYearString}</h1>
          <div className="calendar-nav">
            <button className="icon-btn" onClick={handlePrevMonth}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="icon-btn" onClick={handleNextMonth}>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="calendar-grid-container">
          <div className="calendar-weekdays">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {days.map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} className="day empty-day" />;
              }
              
              const hasEvents = monthEvents.some(e => isOnLocalDate(e.startDate, date));
              const hasNotes = monthNotes.some(n => isOnLocalDate(n.eventDate, date));
              const isSelected = isSameDay(date, selectedDate);
              
              return (
                <div 
                  key={i} 
                  className={`day ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <span className="day-number">{date.getDate()}</span>
                  <div className="day-indicators">
                    {hasEvents && <div className="indicator event-indicator" />}
                    {hasNotes && <div className="indicator note-indicator" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="daily-agenda mb-8">
          <h2 className="agenda-date">{selectedFullDateString}</h2>
          
          <div className="agenda-items">
            {selectedEvents.map(event => (
              <div 
                key={event.id} 
                className="agenda-item event-item"
                onClick={() => navigate(`/event/${event.id}`)}
              >
                <div className="item-icon-wrapper event-icon">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
                <div className="item-content">
                  <h3 className="item-title">{event.title}</h3>
                  <p className="item-subtitle">
                    {formatTime(event.startDate)} {event.endDate ? `- ${formatTime(event.endDate)}` : ''}
                  </p>
                </div>
                <button className="edit-btn">
                  <span className="material-symbols-outlined">edit</span>
                </button>
              </div>
            ))}

            {selectedNotes.map(note => (
              <div 
                key={note.id} 
                className="agenda-item note-item"
                onClick={() => navigate(`/${note.type === 'checklist' ? 'checklist' : 'note'}/${note.id}`)}
              >
                <div className="item-icon-wrapper note-icon">
                  <span className="material-symbols-outlined">
                    {note.type === 'checklist' ? 'radio_button_unchecked' : 'description'}
                  </span>
                </div>
                <div className="item-content">
                  <h3 className="item-title">{note.title}</h3>
                  {note.type === 'checklist' && note.checklistTotal !== undefined && (
                    <div className="item-meta">
                      <span className="material-symbols-outlined icon-small">checklist</span>
                      <span>{note.checklistCompleted}/{note.checklistTotal}</span>
                    </div>
                  )}
                </div>
                <button className="edit-btn">
                  <span className="material-symbols-outlined">edit</span>
                </button>
              </div>
            ))}
            
            {selectedEvents.length === 0 && selectedNotes.length === 0 && (
              <div className="empty-agenda">
                No events or notes for this date.
              </div>
            )}
            
            <button 
              className="add-event-btn text-base" 
              onClick={() => navigate('/event/new', { state: { date: selectedDateStr }})}
            >
              <span className="material-symbols-outlined">add</span>
              Add event for this date
            </button>
          </div>

          {/* Reminders for the selected date */}
          <div className="reminders-section">
            <h3 className="reminders-title">
              <span className="material-symbols-outlined">notifications_active</span>
              Reminders
            </h3>
            {selectedReminders.length === 0 ? (
              <p className="reminders-empty">No reminders for this date.</p>
            ) : (
              <div className="reminders-list">
                {selectedReminders.map((reminder) => {
                  const parent = reminder.parentType === 'event'
                    ? eventsMap[reminder.parentId]
                    : notesMap[reminder.parentId];
                  const title = parent?.title || 'Untitled';
                  return (
                    <div
                      key={reminder.id}
                      className="agenda-item reminder-item"
                      onClick={() => openReminderParent(reminder.parentId, reminder.parentType)}
                    >
                      <div className="item-icon-wrapper reminder-icon">
                        <span className="material-symbols-outlined">notifications</span>
                      </div>
                      <div className="item-content">
                        <h3 className="item-title">{title}</h3>
                        <p className="item-subtitle">{formatTime(reminder.remindAt)}</p>
                      </div>
                      <button className="edit-btn">
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
