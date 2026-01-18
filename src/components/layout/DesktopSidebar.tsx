import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Library,
  BookOpen,
  Users,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Upload,
  HelpCircle,
  Bell,
  CreditCard,
  Download,
  Heart,
  List,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceType } from "@/hooks/use-mobile";
import somLogo from "@/images/som-logo.png";

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */

interface DesktopSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

/* ------------------------------------------------------------------ */
/* NAV CONFIG */
/* ------------------------------------------------------------------ */

const mainNavItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/library", icon: Library, label: "Library" },
  { to: "/tools", icon: BookOpen, label: "Daily Tools" },
  { to: "/community", icon: Users, label: "Community" },
  { to: "/qa", icon: Users, label: "Q&A Sessions" },
  { to: "/playlists", icon: List, label: "Playlists" },
  { to: "/favorites", icon: Heart, label: "Favorites" },
];

const accountNavItems = [
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/offline", icon: Download, label: "Offline" },
  { to: "/subscription", icon: CreditCard, label: "Subscription" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/help", icon: HelpCircle, label: "Help & FAQ" },
];

const adminNavItems = [
  { to: "/admin", icon: Shield, label: "Dashboard" },
  { to: "/admin/user-management", icon: Users, label: "User Management" },
  { to: "/admin/moderation", icon: Shield, label: "Content Moderation" },
];

/* ------------------------------------------------------------------ */
/* HELPERS */
/* ------------------------------------------------------------------ */

function useIsActive(path: string) {
  const { pathname } = useLocation();
  if (path === "/") return pathname === "/";
  return new RegExp(`^${path}(/|$)`).test(pathname);
}

function SidebarItem({
  to,
  icon: Icon,
  label,
  collapsed,
  section,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  section: string;
}) {
  const active = useIsActive(to);

  return (
    <NavLink
      to={to}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2.5",
        "transition-colors focus:outline-none focus-visible:ring-2",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      {active && (
        <motion.span
          layoutId={`sidebar-indicator-${section}`}
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-accent"
        />
      )}

      <Icon className="h-5 w-5 shrink-0" aria-hidden />

      {!collapsed && (
        <span className="truncate font-medium">{label}</span>
      )}
    </NavLink>
  );
}

/* ------------------------------------------------------------------ */
/* COMPONENT */
/* ------------------------------------------------------------------ */

export function DesktopSidebar({
  collapsed,
  onCollapsedChange,
}: DesktopSidebarProps) {
  const { hasRole, isLoading } = useAuth();
  const { isTablet, isDesktop } = useDeviceType();

  const expandedWidth = isDesktop ? 256 : 192; // lg:w-64 : w-48

  return (
    <aside
      className={cn(
        "sticky top-0 z-40 flex h-screen flex-col border-r bg-sidebar transition-[width]"
      )}
      style={{ width: collapsed ? '64px' : `${expandedWidth}px` }}
      aria-label="Primary navigation"
    >
      {/* Header / Logo */}
      <div className="flex h-16 items-center justify-center border-b px-4">
        <img
          src={somLogo}
          alt="SOM Connect"
          className={cn(
            "h-10 w-10 transition-transform",
            collapsed ? "scale-100" : "scale-110"
          )}
        />
        {!collapsed && (
          <span className="ml-2 font-semibold">SOM CONNECT</span>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-3 pb-2 text-xs font-semibold uppercase text-muted-foreground">
          {!collapsed && "Main"}
        </div>

        <ul className="space-y-1 px-2">
          {mainNavItems.map((item) => (
            <li key={item.to}>
              <SidebarItem
                {...item}
                collapsed={collapsed}
                section="main"
              />
            </li>
          ))}
        </ul>

        {hasRole(["pastor", "admin"]) && !isLoading && (
          <>
            <Separator className="my-4" />
            <ul className="space-y-1 px-2">
              <SidebarItem
                to="/upload"
                icon={Upload}
                label="Upload Content"
                collapsed={collapsed}
                section="content"
              />
            </ul>
          </>
        )}

        {hasRole(["admin"]) && !isLoading && (
          <>
            <Separator className="my-4" />
            <ul className="space-y-1 px-2">
              {adminNavItems.map((item) => (
                <li key={item.to}>
                  <SidebarItem
                    {...item}
                    collapsed={collapsed}
                    section="admin"
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        <Separator className="my-4" />

        <ul className="space-y-1 px-2">
          {accountNavItems.map((item) => (
            <li key={item.to}>
              <SidebarItem
                {...item}
                collapsed={collapsed}
                section="account"
              />
            </li>
          ))}
        </ul>
      </div>

      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-expanded={!collapsed}
          aria-controls="sidebar"
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <>
              <ChevronLeft className="mr-2 h-4 w-4" aria-hidden />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}


// import React from 'react';
// import { NavLink, useLocation } from 'react-router-dom';
// import {
//   Home, Library, BookOpen, Users, User, Settings,
//   ChevronLeft, ChevronRight, Shield, Upload, HelpCircle,
//   Bell, CreditCard, Download, Heart, List
// } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { Button } from '@/components/ui/button';
// import { Separator } from '@/components/ui/separator';
// import { useAuth } from '@/contexts/AuthContext';
// import { motion, AnimatePresence } from 'framer-motion';
// import somLogo from '@/images/som-logo.png';

// interface DesktopSidebarProps {
//   collapsed: boolean;
//   onCollapsedChange: (collapsed: boolean) => void;
// }

// const mainNavItems = [
//   { to: '/', icon: Home, label: 'Home' },
//   { to: '/library', icon: Library, label: 'Library' },
//   { to: '/tools', icon: BookOpen, label: 'Daily Tools' },
//   { to: '/community', icon: Users, label: 'Community' },
//   { to: '/qa', icon: Users, label: 'Q&A Sessions' },
//   { to: '/playlists', icon: List, label: 'Playlists' },
//   { to: '/favorites', icon: Heart, label: 'Favorites' },
// ];

// const accountNavItems = [
//   { to: '/profile', icon: User, label: 'Profile' },
//   { to: '/notifications', icon: Bell, label: 'Notifications' },
//   { to: '/offline', icon: Download, label: 'Offline' },
//   { to: '/subscription', icon: CreditCard, label: 'Subscription' },
//   { to: '/settings', icon: Settings, label: 'Settings' },
//   { to: '/help', icon: HelpCircle, label: 'Help & FAQ' },
// ];

// const adminNavItems = [
//   { to: '/admin', icon: Shield, label: 'Dashboard' },
//   { to: '/admin/user-management', icon: Users, label: 'User Management' },
//   { to: '/admin/moderation', icon: Shield, label: 'Content Moderation' },
// ];

// export function DesktopSidebar({ collapsed, onCollapsedChange }: DesktopSidebarProps) {
//   const location = useLocation();
//   const { user, hasRole } = useAuth();

//   const isActive = (path: string) => {
//     return location.pathname === path || 
//       (path !== '/' && location.pathname.startsWith(path));
//   };

//   return (
//     <aside
//       className={cn(
//         "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border",
//         "flex flex-col transition-all duration-300 z-40"
//       )}
//       role="navigation"
//       aria-label="Sidebar navigation"
//     >
//       {/* Logo */}
//       <div className={cn(
//         "flex items-center h-16 px-4 border-b border-sidebar-border",
//         collapsed ? "justify-center" : "justify-between"
//       )}>
//         <AnimatePresence mode="wait">
//           {!collapsed && (
//             <motion.div
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               className="flex items-center gap-2"
//             >
//               <img src={somLogo} alt="SOM Connect Logo" className="w-12 h-12 object-contain" />
//               <span className="font-semibold text-sidebar-foreground">SOM CONNECT</span>
//             </motion.div>
//           )}
//         </AnimatePresence>
         
//         {collapsed && (
//           <img src={somLogo} alt="SOM Connect Logo" className="w-12 h-12 object-contain" />
//         )}
//       </div>

//       {/* Navigation */}
//       <nav className="flex-1 py-4 overflow-y-auto scrollbar-custom">
//         <div className="px-3 mb-2">
//           {!collapsed && (
//             <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3">
//               Main
//             </span>
//           )}
//         </div>
        
//         <motion.ul
//           className="space-y-1 px-3"
//           initial="collapsed"
//           animate={!collapsed ? "expanded" : "collapsed"}
//           variants={{
//             expanded: {
//               transition: {
//                 staggerChildren: 0.05,
//                 delayChildren: 0.1
//               }
//             },
//             collapsed: {}
//           }}
//         >
//           {mainNavItems.map((item, index) => (
//             <li key={item.to}>
//               <motion.div
//                 whileHover={{ scale: 1.02, x: 4 }}
//                 whileTap={{ scale: 0.98 }}
//                 transition={{ type: "spring", stiffness: 400, damping: 20 }}
//               >
//                 <NavLink
//                   to={item.to}
//                   className={cn(
//                     "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
//                     "hover:bg-sidebar-accent group",
//                     isActive(item.to)
//                       ? "bg-sidebar-primary text-sidebar-primary-foreground"
//                       : "text-sidebar-foreground"
//                   )}
//                   title={collapsed ? item.label : undefined}
//                   aria-current={isActive(item.to) ? 'page' : undefined}
//                 >
//                   {isActive(item.to) && (
//                     <motion.div
//                       layoutId="sidebarActiveIndicator"
//                       className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-accent rounded-r-full"
//                       initial={{ scale: 0.8, opacity: 0 }}
//                       animate={{ scale: 1, opacity: 1 }}
//                       transition={{ type: "spring", stiffness: 600, damping: 25 }}
//                     />
//                   )}
//                 <item.icon className={cn(
//                   "w-5 h-5 flex-shrink-0",
//                   isActive(item.to) && "text-sidebar-accent"
//                 )} />
//                 <AnimatePresence>
//                   {!collapsed && (
//                     <motion.span
//                       initial={{ opacity: 0, width: 0 }}
//                       animate={{ opacity: 1, width: 'auto' }}
//                       exit={{ opacity: 0, width: 0 }}
//                       className="font-medium truncate"
//                     >
//                       {item.label}
//                     </motion.span>
//                   )}
//                 </AnimatePresence>
//               </NavLink>
//               </motion.div>
//             </li>
//           ))}
//         </motion.ul>

//         {/* Pastor Upload */}
//         {hasRole(['pastor', 'admin']) && (
//           <>
//             <Separator className="my-6 mx-3" />
//             <div className="px-3 mb-2">
//               {!collapsed && (
//                 <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3">
//                   Content
//                 </span>
//               )}
//             </div>
//             <div className="px-3">
//               <motion.div
//                 variants={{
//                   expanded: { opacity: 1, x: 0 },
//                   collapsed: { opacity: 0, x: -20 }
//                 }}
//                 whileHover={{ scale: 1.02, x: 4 }}
//                 whileTap={{ scale: 0.98 }}
//                 transition={{ type: "spring", stiffness: 400, damping: 20 }}
//               >
//                 <NavLink
//                   to="/upload"
//                   className={cn(
//                     "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
//                     "hover:bg-sidebar-accent group",
//                     isActive('/upload')
//                       ? "bg-sidebar-primary text-sidebar-primary-foreground"
//                       : "text-sidebar-foreground"
//                   )}
//                   title={collapsed ? 'Upload Content' : undefined}
//                   aria-current={isActive('/upload') ? 'page' : undefined}
//                 >
//                   {isActive('/upload') && (
//                     <motion.div
//                       layoutId="sidebarActiveIndicator"
//                       className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-accent rounded-r-full"
//                       initial={{ scale: 0.8, opacity: 0 }}
//                       animate={{ scale: 1, opacity: 1 }}
//                       transition={{ type: "spring", stiffness: 600, damping: 25 }}
//                     />
//                   )}
//                   <Upload className={cn(
//                     "w-5 h-5 flex-shrink-0",
//                     isActive('/upload') && "text-sidebar-accent"
//                   )} />
//                   <AnimatePresence>
//                     {!collapsed && (
//                       <motion.span
//                         initial={{ opacity: 0, width: 0 }}
//                         animate={{ opacity: 1, width: 'auto' }}
//                         exit={{ opacity: 0, width: 0 }}
//                         className="font-medium truncate"
//                       >
//                         Upload Content
//                       </motion.span>
//                     )}
//                   </AnimatePresence>
//                 </NavLink>
//               </motion.div>
//             </div>
//           </>
//         )}

//         {/* Admin */}
//         {hasRole(['admin']) && (
//           <>
//             <Separator className="my-6 mx-3" />
//             <div className="px-3 mb-2">
//               {!collapsed && (
//                 <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3">
//                   Admin
//                 </span>
//               )}
//             </div>
//             <ul className="space-y-1 px-3">
//               {adminNavItems.map((item) => (
//                 <li key={item.to}>
//                   <motion.div
//                     whileHover={{ scale: 1.02, x: 4 }}
//                     whileTap={{ scale: 0.98 }}
//                     transition={{ type: "spring", stiffness: 400, damping: 20 }}
//                   >
//                     <NavLink
//                       to={item.to}
//                       className={cn(
//                         "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
//                         "hover:bg-sidebar-accent group",
//                         isActive(item.to)
//                           ? "bg-sidebar-primary text-sidebar-primary-foreground"
//                           : "text-sidebar-foreground"
//                       )}
//                       title={collapsed ? item.label : undefined}
//                       aria-current={isActive(item.to) ? 'page' : undefined}
//                     >
//                       {isActive(item.to) && (
//                         <motion.div
//                           layoutId="sidebarActiveIndicator"
//                           className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-accent rounded-r-full"
//                           initial={{ scale: 0.8, opacity: 0 }}
//                           animate={{ scale: 1, opacity: 1 }}
//                           transition={{ type: "spring", stiffness: 600, damping: 25 }}
//                         />
//                       )}
//                     <item.icon className="w-5 h-5 flex-shrink-0" />
//                     <AnimatePresence>
//                       {!collapsed && (
//                         <motion.span
//                           initial={{ opacity: 0, width: 0 }}
//                           animate={{ opacity: 1, width: 'auto' }}
//                           exit={{ opacity: 0, width: 0 }}
//                           className="font-medium truncate"
//                         >
//                           {item.label}
//                         </motion.span>
//                       )}
//                     </AnimatePresence>
//                   </NavLink>
//                   </motion.div>
//                 </li>
//               ))}
//             </ul>
//           </>
//         )}

//         <Separator className="my-6 mx-3" />
        
//         <div className="px-3 mb-2">
//           {!collapsed && (
//             <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3">
//               Account
//             </span>
//           )}
//         </div>
        
//         <ul className="space-y-1 px-3">
//           {accountNavItems.map((item) => (
//             <li key={item.to}>
//               <motion.div
//                 whileHover={{ scale: 1.02, x: 4 }}
//                 whileTap={{ scale: 0.98 }}
//                 transition={{ type: "spring", stiffness: 400, damping: 20 }}
//               >
//                 <NavLink
//                   to={item.to}
//                   className={cn(
//                     "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
//                     "hover:bg-sidebar-accent group",
//                     isActive(item.to)
//                       ? "bg-sidebar-primary text-sidebar-primary-foreground"
//                       : "text-sidebar-foreground"
//                   )}
//                   title={collapsed ? item.label : undefined}
//                   aria-current={isActive(item.to) ? 'page' : undefined}
//                 >
//                   {isActive(item.to) && (
//                     <motion.div
//                       layoutId="sidebarActiveIndicator"
//                       className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-accent rounded-r-full"
//                       initial={{ scale: 0.8, opacity: 0 }}
//                       animate={{ scale: 1, opacity: 1 }}
//                       transition={{ type: "spring", stiffness: 600, damping: 25 }}
//                     />
//                   )}
//                 <item.icon className={cn(
//                   "w-5 h-5 flex-shrink-0",
//                   isActive(item.to) && "text-sidebar-accent"
//                 )} />
//                 <AnimatePresence>
//                   {!collapsed && (
//                     <motion.span
//                       initial={{ opacity: 0, width: 0 }}
//                       animate={{ opacity: 1, width: 'auto' }}
//                       exit={{ opacity: 0, width: 0 }}
//                       className="font-medium truncate"
//                     >
//                       {item.label}
//                     </motion.span>
//                   )}
//                 </AnimatePresence>
//               </NavLink>
//               </motion.div>
//             </li>
//           ))}
//         </ul>
//       </nav>

//       {/* Collapse toggle */}
//       <div className="p-3 border-t border-sidebar-border">
//         <Button
//           variant="ghost"
//           size="sm"
//           onClick={() => onCollapsedChange(!collapsed)}
//           className={cn(
//             "w-full justify-center",
//             !collapsed && "justify-start"
//           )}
//           aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
//         >
//           {collapsed ? (
//             <ChevronRight className="w-4 h-4" />
//           ) : (
//             <>
//               <ChevronLeft className="w-4 h-4 mr-2" />
//               <span>Collapse</span>
//             </>
//           )}
//         </Button>
//       </div>
//     </aside>
//   );
// }
