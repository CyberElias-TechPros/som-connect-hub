import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { TopBar } from './TopBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Pages where we don't show navigation
  const hideNavRoutes = ['/splash', '/onboarding', '/login', '/register', '/forgot-password', '/player'];
  const hideNav = hideNavRoutes.some(route => location.pathname.startsWith(route));

  if (hideNav) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Desktop layout */}
      {!isMobile && (
        <div className="flex min-h-screen">
          <DesktopSidebar 
            collapsed={sidebarCollapsed} 
            onCollapsedChange={setSidebarCollapsed} 
          />
          <div className={cn(
            "flex-1 flex flex-col transition-all duration-300",
            sidebarCollapsed ? "ml-16" : "ml-64"
          )}>
            <TopBar onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
            <main 
              id="main-content" 
              className="flex-1 p-6 overflow-auto"
              role="main"
              aria-label="Main content"
            >
              <Outlet />
            </main>
          </div>
        </div>
      )}

      {/* Mobile layout */}
      {isMobile && (
        <div className="flex flex-col min-h-screen">
          <TopBar />
          <main 
            id="main-content" 
            className="flex-1 pb-20 overflow-auto"
            role="main"
            aria-label="Main content"
          >
            <Outlet />
          </main>
          <BottomNav />
        </div>
      )}
    </div>
  );
}
