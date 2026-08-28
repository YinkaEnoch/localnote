import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';
import { BottomNavBar } from './BottomNavBar';
import { TopBar } from './TopBar';
import './AppLayout.css';

export function AppLayout() {
  return (
    <div className="app-layout">
      <DesktopSidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content">
          <Outlet />
        </main>
        <BottomNavBar />
      </div>
    </div>
  );
}
