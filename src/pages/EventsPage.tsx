import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventRepository, type EventSortOption } from '@/database/repositories/EventRepository';
import { FolderRepository } from '@/database/repositories/FolderRepository';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { cancelEventReminder } from '@/services/reminderService';
import { NOTE_COLOR_VAR } from '@/theme/colors';
import type { Event } from '@/types/models';
import { formatEventDateTime12h } from '@/utils/time';
import './EventsPage.css';

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50];

const SORT_LABELS: Record<EventSortOption, string> = {
  startAsc: 'Date up',
  startDesc: 'Date down',
  updated: 'Updated',
  created: 'Created',
  alphabetical: 'A-Z',
};

const SORT_OPTIONS: EventSortOption[] = ['startAsc', 'startDesc', 'updated', 'created', 'alphabetical'];

function formatEventDate(e: Event): string {
  return formatEventDateTime12h(e.startDate, { allDay: e.allDay });
}

export function EventsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<EventSortOption>('startAsc');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Event | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [folderNames, setFolderNames] = useState<Record<string, string>>({});
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await EventRepository.getPaged({ page, pageSize, sortBy, query: debouncedQuery });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      if (res.page !== page) setPage(res.page);
    } catch (e) {
      console.error('Failed to load events:', e);
      setError('Could not load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, debouncedQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) setIsSortMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const ids = [...new Set(items.map((i) => i.folderId).filter((f): f is string => !!f))].filter((id) => !(id in folderNames));
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries: Record<string, string> = {};
      for (const id of ids) {
        try { const f = await FolderRepository.getById(id); if (f) entries[id] = f.name; } catch { /* ignore */ }
      }
      if (!cancelled && Object.keys(entries).length > 0) setFolderNames((prev) => ({ ...prev, ...entries }));
    })();
    return () => { cancelled = true; };
  }, [items, folderNames]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setDeletingId(id);
    try {
      try { await cancelEventReminder(id); } catch (e) { console.warn('Failed to cancel event reminder (continuing delete):', e); }
      await EventRepository.remove(id);
      if (items.length === 1 && page > 1) setPage(page - 1);
      else await loadData();
    } catch (e) {
      console.error('Failed to delete event:', e);
      setError('Could not delete that event. Please try again.');
      await loadData();
    } finally {
      setDeletingId(null);
    }
  };

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(total, page * pageSize);
  const pageNumbers = (): (number | 'gap')[] => {
    const wanted = [1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages);
    const uniq = [...new Set(wanted)].sort((a, b) => a - b);
    const out: (number | 'gap')[] = [];
    uniq.forEach((p, idx) => {
      if (idx > 0 && p - (uniq[idx - 1] as number) > 1) out.push('gap');
      out.push(p);
    });
    return out;
  };
  return (
    <div className="events-page">
      <div className="events-container">
        <header className="events-header desktop-only">
          <h1 className="events-title">All Events</h1>
          <p className="events-subtitle">{total === 0 ? 'No events yet' : `Showing ${startItem}-${endItem} of ${total} events`}</p>
        </header>
        <div className="events-toolbar">
          <div className="events-search-wrapper">
            <span className="material-symbols-outlined events-search-icon">search</span>
            <input type="text" className="events-search-input" placeholder="Search events..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search events" />
            {query.length > 0 && (
              <button className="events-clear-btn" onClick={() => setQuery('')} aria-label="Clear search">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
          <div className="relative" ref={sortRef}>
            <button className="events-sort-button" onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} aria-haspopup="listbox" aria-expanded={isSortMenuOpen}>
              <span className="label">{SORT_LABELS[sortBy]}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>sort</span>
            </button>
            {isSortMenuOpen && (
              <div className="events-sort-menu" role="listbox">
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt} role="option" aria-selected={sortBy === opt} className={sortBy === opt ? 'active' : ''} onClick={() => { setSortBy(opt); setPage(1); setIsSortMenuOpen(false); }}>{SORT_LABELS[opt]}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="events-mobile-count" aria-live="polite">{total === 0 ? 'No events yet' : `${total} event${total === 1 ? '' : 's'} - Page ${page} of ${totalPages}`}</p>
        {error && <div className="events-error">{error}</div>}
        {loading ? (
          <div className="events-loading" aria-label="Loading events"><div className="events-spinner" /></div>
        ) : items.length === 0 ? (
          <div className="events-empty">
            <div className="events-empty-icon-wrapper"><span className="material-symbols-outlined events-empty-icon">event</span></div>
            <h3>{debouncedQuery ? 'No matching events' : 'No events yet'}</h3>
            <p>{debouncedQuery ? `Nothing matches "${debouncedQuery}". Try a different search.` : 'Create your first event to see it listed here.'}</p>
            {!debouncedQuery && (
              <button className="events-empty-cta" onClick={() => navigate('/event/new')}>
                <span className="material-symbols-outlined">add</span> New event
              </button>
            )}
          </div>
        ) : (
          <div className="events-list">
            {items.map((event) => {
              const colorVar = NOTE_COLOR_VAR[event.color] || 'var(--color-secondary)';
              const folderName = event.folderId ? folderNames[event.folderId] : undefined;
              return (
                <article key={event.id} className="event-card">
                  <div className="event-card-indicator" style={{ backgroundColor: colorVar }} />
                  <div className="event-card-main" onClick={() => navigate(`/event/${event.id}`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/event/${event.id}`); }} aria-label={`Edit ${event.title || 'Untitled event'}`}>
                    <div className="event-card-header">
                      <h3 className="event-card-title">{event.title || 'Untitled'}</h3>
                      <span className="event-card-date">{formatEventDate(event)}</span>
                    </div>
                    {event.description && <p className="event-card-desc">{event.description}</p>}
                    <div className="event-card-meta">
                      {event.reminders.length > 0 && (
                        <span className="event-meta-chip"><span className="material-symbols-outlined">notifications</span>{event.reminders.length} reminder{event.reminders.length === 1 ? '' : 's'}</span>
                      )}
                      {folderName && (
                        <span className="event-meta-chip"><span className="material-symbols-outlined">folder</span>{folderName}</span>
                      )}
                    </div>
                  </div>
                  <div className="event-card-actions">
                    <button className="event-icon-btn" onClick={() => navigate(`/event/${event.id}`)} aria-label={`Edit ${event.title || 'event'}`} title="Edit">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button className="event-icon-btn danger" onClick={() => setPendingDelete(event)} disabled={deletingId === event.id} aria-label={`Delete ${event.title || 'event'}`} title="Delete">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {totalPages > 1 && (
          <nav className="events-pagination" aria-label="Events pages">
            <button className="events-page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {pageNumbers().map((p, idx) =>
              p === 'gap' ? (
                <span key={`gap-${idx}`} className="events-page-gap">...</span>
              ) : (
                <button key={p} className={`events-page-btn number ${p === page ? 'active' : ''}`} onClick={() => setPage(p)} aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined}>{p}</button>
              )
            )}
            <button className="events-page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next page">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
            <select className="events-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Events per page">
              {PAGE_SIZE_OPTIONS.map((size) => (<option key={size} value={size}>{size} / page</option>))}
            </select>
          </nav>
        )}
      </div>
      <ConfirmDialog isOpen={pendingDelete !== null} title={`Delete "${pendingDelete?.title || 'Untitled'}"?`} message="This event will be permanently removed, including its reminders. This action cannot be undone." confirmText="Delete" destructive onConfirm={handleDelete} onCancel={() => setPendingDelete(null)} />
    </div>
  );
}
