import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { TopBar } from './TopBar';
import { useDeviceType } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { AccessibilityToolbar } from '@/components/ui/AccessibilityFeatures';
import { useAuth } from '@/contexts/AuthContext';

function AnimatedOutlet() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

export function AppLayout() {
  const { isMobile, isTablet, isDesktop } = useDeviceType();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const expandedWidth = isDesktop ? 280 : 260;

  const hideNavRoutes = ['/splash', '/onboarding', '/login', '/register', '/forgot-password', '/player'];
  const hideNav = hideNavRoutes.some(route => location.pathname === route || location.pathname.startsWith(`${route}/`));

  // Auth guard: if not authenticated and not loading, redirect to login except public routes
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const publicRoutes = ['/splash', '/onboarding', '/login', '/register', '/forgot-password'];
      const isPublic = publicRoutes.some(r => location.pathname === r || location.pathname.startsWith(r + '/'));
      if (!isPublic) {
        // Check localStorage for onboarding
        const seen = localStorage.getItem('som_seen_onboarding');
        if (!seen) navigate('/splash');
        else navigate('/login');
      }
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  useEffect(() => {
    if (isMobile) setSidebarCollapsed(false);
  }, [isMobile]);

  if (hideNav) {
    return <Outlet />;
  }

  // Show loading state while auth resolves — premium skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-foreground animate-pulse" />
          <div className="w-24 h-2 rounded-full bg-secondary animate-pulse" />
        </div>
      </div>
    );
  }

  if (isDesktop) {
    return (
      <>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <div className="flex min-h-screen bg-background relative">
          {/* Ambient mesh */}
          <div className="pointer-events-none fixed inset-0 bg-mesh opacity-[0.03] dark:opacity-[0.06]" />
          <motion.aside id="desktop-sidebar" aria-hidden={sidebarCollapsed} animate={{ width: sidebarCollapsed ? 72 : expandedWidth }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} className="shrink-0 relative z-10">
            <DesktopSidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
          </motion.aside>
          <div className="flex-1 flex flex-col min-w-0 relative z-10">
            <TopBar onMenuClick={() => setSidebarCollapsed(v => !v)} aria-expanded={!sidebarCollapsed} aria-controls="desktop-sidebar" />
            <main id="main-content" role="main" aria-label="Main content" className="flex-1 overflow-auto">
              <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
                <AnimatedOutlet />
              </div>
            </main>
          </div>
        </div>
        <AccessibilityToolbar />
      </>
    );
  }

  if (isTablet) {
    return (
      <>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <div className="flex flex-col min-h-screen bg-background relative">
          <div className="pointer-events-none fixed inset-0 bg-mesh opacity-[0.03]" />
          <div className="flex flex-1 relative z-10">
            <motion.aside id="tablet-sidebar" aria-hidden={sidebarCollapsed} animate={{ width: sidebarCollapsed ? 72 : expandedWidth }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} className="shrink-0">
              <DesktopSidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
            </motion.aside>
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar collapsed={sidebarCollapsed} onMenuClick={() => setSidebarCollapsed(v => !v)} aria-expanded={!sidebarCollapsed} aria-controls="tablet-sidebar" />
              <main id="main-content" role="main" aria-label="Main content" className="flex-1 overflow-auto p-4 pb-24">
                <AnimatedOutlet />
              </main>
            </div>
          </div>
          <BottomNav />
        </div>
        <AccessibilityToolbar />
      </>
    );
  }

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="flex flex-col min-h-screen bg-background relative">
        <div className="pointer-events-none fixed inset-0 bg-mesh opacity-[0.04]" />
        <div className="relative z-10 flex flex-col min-h-screen">
          <TopBar />
          <main id="main-content" role="main" aria-label="Main content" className="flex-1 overflow-auto pb-28">
            <div className="p-4">
              <AnimatedOutlet />
            </div>
          </main>
          <BottomNav />
        </div>
      </div>
      <AccessibilityToolbar />
    </>
  );
}
