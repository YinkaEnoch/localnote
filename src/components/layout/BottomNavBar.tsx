import { useLocation, useNavigate } from 'react-router-dom';
import { IconHome, IconCalendar, IconSearch, IconSettings } from '../ui/Icons';
import './BottomNavBar.css';

export function BottomNavBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/', label: 'Notes', icon: IconHome },
    { path: '/calendar', label: 'Calendar', icon: IconCalendar },
    { path: '/search', label: 'Search', icon: IconSearch },
    { path: '/settings', label: 'Settings', icon: IconSettings },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const IconComponent = tab.icon;
        return (
          <button
            key={tab.path}
            className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <div className={isActive ? 'bottom-nav__pill' : 'bottom-nav__icon-wrapper'}>
              <IconComponent size={24} />
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
