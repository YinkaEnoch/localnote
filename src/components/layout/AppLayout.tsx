import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';
import { BottomNavBar } from './BottomNavBar';
import { TopBar } from './TopBar';
import { MobileDrawer } from './MobileDrawer';
import { DrawerContext } from './DrawerContext';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import './AppLayout.css';

export function AppLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const swipeProps = useSwipeNavigation();

  return (
    <DrawerContext.Provider value={() => setIsDrawerOpen(true)}>
      <div className="app-layout">
        <DesktopSidebar />
        <div className="app-main">
          <TopBar onMenuClick={() => setIsDrawerOpen(true)} />
          <main className="app-content" {...swipeProps}>
            <Outlet />
          </main>
          <BottomNavBar />
        </div>
        {isDrawerOpen && <MobileDrawer onClose={() => setIsDrawerOpen(false)} />}
      </div>
    </DrawerContext.Provider>
  );
}
