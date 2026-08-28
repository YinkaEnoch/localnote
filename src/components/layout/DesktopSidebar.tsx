import { useLocation, useNavigate } from 'react-router-dom';
import { IconHome, IconCalendar, IconSettings } from '../ui/Icons';
import './DesktopSidebar.css';

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'All Notes', icon: <IconHome size={20} /> },
    { path: '/calendar', label: 'Calendar', icon: <IconCalendar size={20} /> },
  ];

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__header">
        <h2>LocalNote</h2>
      </div>
      <nav className="app-sidebar__nav">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="app-sidebar__icon">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="app-sidebar__footer">
        <button
          className={`app-sidebar__item ${location.pathname === '/settings' ? 'app-sidebar__item--active' : ''}`}
          onClick={() => navigate('/settings')}
        >
          <span className="app-sidebar__icon"><IconSettings size={20} /></span>
          Settings
        </button>
      </div>
    </aside>
  );
}
