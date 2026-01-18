import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { TopBar } from './TopBar';
import { useDeviceType } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { AccessibilityToolbar } from '@/components/ui/AccessibilityFeatures';

/* ---------------------------------------------
   Shared animated outlet (no remounting)
--------------------------------------------- */
function AnimatedOutlet() {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

export function AppLayout() {
  const { isMobile, isTablet, isDesktop } = useDeviceType();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const expandedWidth = isDesktop ? 256 : 192;

  /* ---------------------------------------------
     Routes without navigation
  --------------------------------------------- */
  const hideNavRoutes = [
    '/splash',
    '/onboarding',
    '/login',
    '/register',
    '/forgot-password',
    '/player',
  ];

  const hideNav = hideNavRoutes.some(
    route => location.pathname === route || location.pathname.startsWith(`${route}/`)
  );

  /* ---------------------------------------------
     Reset sidebar when entering mobile
  --------------------------------------------- */
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(false);
    }
  }, [isMobile]);

  if (hideNav) {
    return (
      <>
        <Outlet />
        {/* Toolbar intentionally hidden when nav is hidden */}
      </>
    );
  }

  /* ---------------------------------------------
     DESKTOP LAYOUT
  --------------------------------------------- */
  if (isDesktop) {
    return (
      <>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <div className="flex min-h-screen bg-background">
          <motion.aside
            id="desktop-sidebar"
            aria-hidden={sidebarCollapsed}
            animate={{ width: sidebarCollapsed ? 64 : expandedWidth }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="shrink-0"
          >
            <DesktopSidebar
              collapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
            />
          </motion.aside>

          <div className="flex-1 flex flex-col">
            <TopBar
              onMenuClick={() => setSidebarCollapsed(v => !v)}
              aria-expanded={!sidebarCollapsed}
              aria-controls="desktop-sidebar"
            />

            <main
              id="main-content"
              role="main"
              aria-label="Main content"
              className="flex-1 overflow-auto p-4 md:p-6 lg:p-8"
            >
              <AnimatedOutlet />
            </main>
          </div>
        </div>

        <AccessibilityToolbar />
      </>
    );
  }

  /* ---------------------------------------------
      TABLET LAYOUT
   --------------------------------------------- */
   if (isTablet) {
     return (
       <>
         <a href="#main-content" className="skip-link">
           Skip to main content
         </a>

         <div className="flex flex-col min-h-screen bg-background">
           <div className="flex flex-1">
             <motion.aside
               id="tablet-sidebar"
               aria-hidden={sidebarCollapsed}
               animate={{ width: sidebarCollapsed ? 64 : expandedWidth }}
               transition={{ type: 'spring', stiffness: 300, damping: 30 }}
               className="shrink-0"
             >
               <DesktopSidebar
                 collapsed={sidebarCollapsed}
                 onCollapsedChange={setSidebarCollapsed}
               />
             </motion.aside>

             <div className="flex-1 flex flex-col">
               <TopBar
                 collapsed={sidebarCollapsed}
                 onMenuClick={() => setSidebarCollapsed(v => !v)}
                 aria-expanded={!sidebarCollapsed}
                 aria-controls="tablet-sidebar"
               />

               <main
                 id="main-content"
                 role="main"
                 aria-label="Main content"
                 className="flex-1 overflow-auto p-3 md:p-4 pb-20"
               >
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

  /* ---------------------------------------------
     MOBILE LAYOUT (default)
  --------------------------------------------- */
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="flex flex-col min-h-screen bg-background">
        <TopBar />

        <main
          id="main-content"
          role="main"
          aria-label="Main content"
          className="flex-1 overflow-auto pb-20"
        >
          <AnimatedOutlet />
        </main>

        <BottomNav />
      </div>

      <AccessibilityToolbar />
    </>
  );
}


// import React, { useState } from 'react';
// import { Outlet, useLocation } from 'react-router-dom';
// import { BottomNav } from './BottomNav';
// import { DesktopSidebar } from './DesktopSidebar';
// import { TopBar } from './TopBar';
// import { useDeviceType } from '@/hooks/use-mobile';
// import { cn } from '@/lib/utils';
// import { motion, AnimatePresence } from 'framer-motion';
// import { AccessibilityToolbar } from '@/components/ui/AccessibilityFeatures';

// export function AppLayout() {
//   const { isMobile, isTablet, isDesktop } = useDeviceType();
//   const location = useLocation();
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

//   // Pages where we don't show navigation
//   const hideNavRoutes = ['/splash', '/onboarding', '/login', '/register', '/forgot-password', '/player'];
//   const hideNav = hideNavRoutes.some(route => location.pathname.startsWith(route));

//   if (hideNav) {
//     return <Outlet />;
//   }

//   return (
//     <>
//       <div className="min-h-screen bg-background">
//         {/* Skip link for accessibility */}
//         <a href="#main-content" className="skip-link">
//           Skip to main content
//         </a>

//         {/* Desktop layout */}
//         {isDesktop && (
//           <div className="flex min-h-screen">
//             <motion.div
//               animate={{ width: sidebarCollapsed ? 64 : 256 }}
//               transition={{ type: "spring", stiffness: 300, damping: 30 }}
//               className="relative"
//             >
//               <DesktopSidebar
//                 collapsed={sidebarCollapsed}
//                 onCollapsedChange={setSidebarCollapsed}
//               />
//             </motion.div>
//             <motion.div
//               className="flex-1 flex flex-col"
//               animate={{ marginLeft: sidebarCollapsed ? 64 : 256 }}
//               transition={{ type: "spring", stiffness: 300, damping: 30 }}
//             >
//               <TopBar onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
//               <main
//                 id="main-content"
//                 className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto"
//                 role="main"
//                 aria-label="Main content"
//               >
//                 <AnimatePresence mode="wait">
//                   <motion.div
//                     key={location.pathname}
//                     initial={{ opacity: 0, y: 10 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: -10 }}
//                     transition={{ duration: 0.2, ease: 'easeInOut' }}
//                   >
//                     <Outlet />
//                   </motion.div>
//                 </AnimatePresence>
//               </main>
//             </motion.div>
//           </div>
//         )}

//         {/* Tablet layout */}
//         {isTablet && (
//           <div className="min-h-screen bg-background">
//             <motion.div
//               className="fixed left-0 top-0 h-screen z-40 border-r border-sidebar-border"
//               animate={{ width: sidebarCollapsed ? 64 : 256 }}
//               transition={{ type: "spring", stiffness: 300, damping: 30 }}
//             >
//               <DesktopSidebar
//                 collapsed={sidebarCollapsed}
//                 onCollapsedChange={setSidebarCollapsed}
//               />
//             </motion.div>
//             <div className="flex min-h-screen">
//               <div className="flex-1 flex flex-col">
//                 <TopBar collapsed={sidebarCollapsed} onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
//                 <main
//                   id="main-content"
//                   className="flex-1 p-3 md:p-4 overflow-auto"
//                   role="main"
//                   aria-label="Main content"
//                 >
//                   <AnimatePresence mode="wait">
//                     <motion.div
//                       key={location.pathname}
//                       initial={{ opacity: 0, y: 10 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       exit={{ opacity: 0, y: -10 }}
//                       transition={{ duration: 0.2, ease: 'easeInOut' }}
//                     >
//                       <Outlet />
//                     </motion.div>
//                   </AnimatePresence>
//                 </main>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Mobile layout */}
//         {isMobile && (
//           <div className="flex flex-col min-h-screen">
//             <TopBar />
//             <main
//               id="main-content"
//               className="flex-1 pb-20 overflow-auto"
//               role="main"
//               aria-label="Main content"
//             >
//               <AnimatePresence mode="wait">
//                 <motion.div
//                   key={location.pathname}
//                   initial={{ opacity: 0, y: 10 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   exit={{ opacity: 0, y: -10 }}
//                   transition={{ duration: 0.2, ease: 'easeInOut' }}
//                 >
//                   <Outlet />
//                 </motion.div>
//               </AnimatePresence>
//             </main>
//             <BottomNav />
//           </div>
//         )}
//       </div>
//       <AccessibilityToolbar />
//     </>
//   );
// }
