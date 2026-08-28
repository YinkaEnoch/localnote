import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventRepository } from '@/database/repositories/EventRepository';
import { NoteRepository } from '@/database/repositories/NoteRepository';
import type { Event, NoteListItem } from '@/types/models';
import './CalendarPage.css';

export function CalendarPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [monthEvents, setMonthEvents] = useState<Event[]>([]);
  const [monthNotes, setMonthNotes] = useState<NoteListItem[]>([]);

  useEffect(() => {
    const fetchMonthData = async () => {
      // In a real app we'd fetch just the month's data, 
      // but EventRepository doesn't have a getByMonth. We have getByDateRange.
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      
      const events = await EventRepository.getByDateRange(startDate, endDate);
      const notes = await NoteRepository.getAll();
      
      setMonthEvents(events);
      setMonthNotes(notes);
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

  const selectedDateStr = formatDateString(selectedDate);
  const selectedEvents = monthEvents.filter(e => e.startDate.startsWith(selectedDateStr));
  const selectedNotes = monthNotes.filter(n => n.eventDate?.startsWith(selectedDateStr));

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
              
              const dateStr = formatDateString(date);
              const hasEvents = monthEvents.some(e => e.startDate.startsWith(dateStr));
              const hasNotes = monthNotes.some(n => n.eventDate?.startsWith(dateStr));
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

        <div className="daily-agenda">
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
              className="add-event-btn" 
              onClick={() => navigate('/event/new', { state: { date: selectedDateStr }})}
            >
              <span className="material-symbols-outlined">add</span>
              Add event for this date
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
