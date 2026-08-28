import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconMenu, IconPlus, IconNote, IconChecklist, IconEvent, IconFolder } from '../ui/Icons';
import './TopBar.css';

interface TopBarProps {
  title?: string;
  showMenu?: boolean;
  onMenuClick?: () => void;
  actions?: ReactNode;
}

export function TopBar({
  title = 'LocalNote',
  showMenu = true,
  onMenuClick,
  actions,
}: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = (type: 'note' | 'checklist' | 'event' | 'folder') => {
    setIsMenuOpen(false);
    switch (type) {
      case 'note':
        navigate('/note/new');
        break;
      case 'checklist':
        navigate('/checklist/new');
        break;
      case 'event':
        navigate('/event/new');
        break;
      case 'folder':
        navigate('/folder/new');
        break;
    }
  };

  return (
    <header className="top-bar">
      {showMenu && (
        <button className="top-bar__menu-btn" onClick={onMenuClick} aria-label="Menu">
          <IconMenu size={24} />
        </button>
      )}
      <h1 className="top-bar__title">{title}</h1>
      <div className="top-bar__actions" ref={menuRef}>
        {actions ? (
          actions
        ) : (
          <div className="top-bar__action-wrapper">
            <button
              className="top-bar__action"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Create New"
            >
              <IconPlus size={24} />
            </button>
            {isMenuOpen && (
              <div className="create-menu">
                <button className="create-menu__item" onClick={() => handleCreate('note')}>
                  <IconNote size={18} />
                  <span>Text Note</span>
                </button>
                <button className="create-menu__item" onClick={() => handleCreate('checklist')}>
                  <IconChecklist size={18} />
                  <span>Checklist</span>
                </button>
                <button className="create-menu__item" onClick={() => handleCreate('event')}>
                  <IconEvent size={18} />
                  <span>Event</span>
                </button>
                <button className="create-menu__item" onClick={() => handleCreate('folder')}>
                  <IconFolder size={18} />
                  <span>Folder</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
