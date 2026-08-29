import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';
import { BottomNavBar } from './BottomNavBar';
import { TopBar } from './TopBar';
import { MobileDrawer } from './MobileDrawer';
import { DrawerContext } from './DrawerContext';
import './AppLayout.css';

export function AppLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <DrawerContext.Provider value={() => setIsDrawerOpen(true)}>
      <div className="app-layout">
        <DesktopSidebar />
        <div className="app-main">
          <TopBar onMenuClick={() => setIsDrawerOpen(true)} />
          <main className="app-content">
            <Outlet />
          </main>
          <BottomNavBar />
        </div>
        {isDrawerOpen && <MobileDrawer onClose={() => setIsDrawerOpen(false)} />}
      </div>
    </DrawerContext.Provider>
  );
}
