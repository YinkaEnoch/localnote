import { useLocation, useNavigate } from 'react-router-dom';
import './MobileDrawer.css';

interface MobileDrawerProps {
  onClose: () => void;
}

const navItems = [
  { path: '/', label: 'All Notes', icon: 'home' },
  { path: '/calendar', label: 'Calendar', icon: 'calendar_today' },
  { path: '/search', label: 'Search', icon: 'search' },
];

export function MobileDrawer({ onClose }: MobileDrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        aria-label="Navigation menu"
      >
        <div className="drawer-header">
          <h2>LocalNote</h2>
        </div>
        <nav className="drawer-nav">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                className={`drawer-item ${isActive ? 'drawer-item--active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="drawer-footer">
          <button
            className={`drawer-item ${location.pathname === '/settings' ? 'drawer-item--active' : ''}`}
            onClick={() => handleNavigate('/settings')}
          >
            <span className="material-symbols-outlined">settings</span>
            Settings
          </button>
        </div>
      </aside>
    </div>
  );
}