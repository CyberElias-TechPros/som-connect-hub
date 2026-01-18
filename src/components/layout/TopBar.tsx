import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, Sun, Moon, X, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useDeviceType } from "@/hooks/use-mobile";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

import somLogo from "@/images/som-logo.png";

interface TopBarProps {
  onMenuClick?: () => void;
  collapsed?: boolean;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}

export function TopBar({ onMenuClick, collapsed, 'aria-expanded': ariaExpanded, 'aria-controls': ariaControls }: TopBarProps = {}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isMobile } = useDeviceType();
  const { notifications, unreadCount } = useNotificationContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ---------------------------------- */
  /* Helpers                            */
  /* ---------------------------------- */

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
    setShowMobileSearch(false);
  };

  /* ---------------------------------- */
  /* Accessibility: focus + ESC handling */
  /* ---------------------------------- */

  useEffect(() => {
    if (showMobileSearch) {
      searchInputRef.current?.focus();
    }
  }, [showMobileSearch]);

  useEffect(() => {
    if (!showMobileSearch) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMobileSearch(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMobileSearch]);

  /* ---------------------------------- */
  /* Render                             */
  /* ---------------------------------- */

  return (
    <header
      className={cn(
        "sticky top-0 z-30",
        "h-16 w-full border-b border-border",
        "bg-background/95 backdrop-blur",
        "flex items-center gap-4 px-4"
      )}
    >
      {/* Menu button (desktop/tablet) */}
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle sidebar"
          aria-expanded={ariaExpanded}
          aria-controls={ariaControls}
          onClick={onMenuClick}
        >
          <Menu />
        </Button>
      )}

      {/* Logo (mobile only) */}
      {isMobile && (
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src={somLogo}
            alt="SOM Connect"
            className="h-10 w-10 object-contain"
          />
          <span className="font-semibold">SOM CONNECT</span>
        </Link>
      )}

      {/* Desktop search */}
      {!isMobile && (
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search content, speakers, topics…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search"
            />
          </div>
        </form>
      )}

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Mobile search toggle */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle search"
            onClick={() => setShowMobileSearch((v) => !v)}
          >
            {showMobileSearch ? <X /> : <Search />}
          </Button>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <AnimatePresence mode="wait" initial={false}>
            {theme === "dark" ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Sun />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Moon />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={`Notifications (${unreadCount} unread)`}
            >
              <Bell />
              {unreadCount > 0 && (
                <Badge
                  aria-live="polite"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {notifications.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No notifications
              </div>
            )}

            {notifications.slice(0, 5).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start gap-1 p-3"
                onClick={() => n.actionUrl && navigate(n.actionUrl)}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    !n.isRead && "text-primary"
                  )}
                >
                  {n.title}
                </span>
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {n.message}
                </span>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-primary"
              onClick={() => navigate("/notifications")}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" onClick={() => navigate("/login")}>
            Sign in
          </Button>
        )}
      </div>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {isMobile && showMobileSearch && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 border-b border-border bg-background p-4"
          >
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}




// import React, { useState, useCallback, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { Search, Bell, Menu, Sun, Moon, X } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import { useAuth } from '@/contexts/AuthContext';
// import { useTheme } from '@/contexts/ThemeContext';
// import { useDeviceType } from '@/hooks/use-mobile';
// import { cn } from '@/lib/utils';
// import { useNotificationContext } from '@/contexts/NotificationContext';
// import { notificationService } from '@/services/notification-service';
// import { motion, AnimatePresence } from 'framer-motion';
// import somLogo from '@/images/som-logo.png';

// interface TopBarProps {
//   onMenuClick?: () => void;
//   collapsed?: boolean;
// }

// export function TopBar({ onMenuClick }: TopBarProps) {
//   const { user, logout } = useAuth();
//   const { theme, setTheme, resolvedTheme } = useTheme();
//   const navigate = useNavigate();
//   const { isMobile, isTablet } = useDeviceType();
//   const [showSearch, setShowSearch] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const { unreadCount } = useNotificationContext();

//   // Enhanced search with debounce
//   const [searchResults, setSearchResults] = useState([]);
//   const [isSearchOpen, setIsSearchOpen] = useState(false);

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (searchQuery.trim()) {
//       navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
//       setShowSearch(false);
//       setSearchQuery('');
//     }
//   };

//   const getInitials = (name: string) => {
//     return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
//   };

//   return (
//     <header 
//       className={cn(
//         "sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border",
//         "h-16 flex items-center px-4 gap-4"
//       )}
//       role="banner"
//     >

//       {/* Logo (mobile only) */}
//       {isMobile && (
//         <Link to="/" className="flex items-center gap-2">
//           <img src={somLogo} alt="SOM Connect Logo" className="w-12 h-12 object-contain" />
//           <span className="font-semibold text-foreground">SOM CONNECT</span>
//         </Link>
//       )}

//       {/* Search bar - desktop */}
//       {!isMobile && (
//         <form onSubmit={handleSearch} className="flex-1 max-w-md">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//             <Input
//               type="search"
//               placeholder="Search content, speakers, topics..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1"
//               aria-label="Search"
//             />
//           </div>
//         </form>
//       )}

//       <div className="flex-1" />

//       {/* Actions */}
//       <div className="flex items-center gap-2">
//         {/* Mobile search toggle */}
//         {isMobile && (
//           <Button 
//             variant="ghost" 
//             size="icon"
//             onClick={() => setShowSearch(!showSearch)}
//             aria-label="Toggle search"
//           >
//             {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
//           </Button>
//         )}

//         {/* Theme toggle */}
//         <motion.div
//           whileHover={{ scale: 1.05 }}
//           whileTap={{ scale: 0.95 }}
//           transition={{ type: "spring", stiffness: 400, damping: 20 }}
//         >
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
//             aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
//           >
//           <AnimatePresence mode="wait">
//             {resolvedTheme === 'dark' ? (
//               <motion.div
//                 key="sun"
//                 initial={{ rotate: -90, opacity: 0 }}
//                 animate={{ rotate: 0, opacity: 1 }}
//                 exit={{ rotate: 90, opacity: 0 }}
//                 transition={{ duration: 0.15 }}
//               >
//                 <Sun className="h-5 w-5" />
//               </motion.div>
//             ) : (
//               <motion.div
//                 key="moon"
//                 initial={{ rotate: 90, opacity: 0 }}
//                 animate={{ rotate: 0, opacity: 1 }}
//                 exit={{ rotate: -90, opacity: 0 }}
//                 transition={{ duration: 0.15 }}
//               >
//                 <Moon className="h-5 w-5" />
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </Button>
//         </motion.div>

//         {/* Notifications */}
//        <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <motion.div
//               whileHover={{ scale: 1.05 }}
//               whileTap={{ scale: 0.95 }}
//               transition={{ type: "spring", stiffness: 400, damping: 20 }}
//             >
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="relative"
//                 aria-label={`Notifications, ${unreadCount} unread`}
//               >
//              <Bell className="h-5 w-5" />
//              {unreadCount > 0 && (
//                <Badge
//                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs"
//                >
//                  {unreadCount}
//                </Badge>
//              )}
//            </Button>
//            </motion.div>
//          </DropdownMenuTrigger>
//          <DropdownMenuContent align="end" className="w-80">
//            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
//            <DropdownMenuSeparator />
//            {notificationService.getNotifications().slice(0, 3).map((notification) => (
//              <DropdownMenuItem
//                key={notification.id}
//                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
//                onClick={() => notification.actionUrl && navigate(notification.actionUrl)}
//              >
//                <div className="flex items-center gap-2 w-full">
//                  <span className={cn(
//                    "font-medium text-sm",
//                    !notification.isRead && "text-primary"
//                  )}>
//                    {notification.title}
//                  </span>
//                  {!notification.isRead && (
//                    <div className="w-2 h-2 rounded-full bg-accent ml-auto" />
//                  )}
//                </div>
//                <span className="text-xs text-muted-foreground line-clamp-1">
//                  {notification.message}
//                </span>
//              </DropdownMenuItem>
//            ))}
//            <DropdownMenuSeparator />
//            <DropdownMenuItem
//              className="justify-center text-primary cursor-pointer"
//              onClick={() => navigate('/notifications')}
//            >
//              View all notifications
//            </DropdownMenuItem>
//          </DropdownMenuContent>
//        </DropdownMenu>

//         {/* User menu */}
//         {user ? (
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button 
//                 variant="ghost" 
//                 size="icon" 
//                 className="rounded-full"
//                 aria-label="User menu"
//               >
//                 <Avatar className="h-8 w-8">
//                   <AvatarImage src={user.avatar} alt={user.name} />
//                   <AvatarFallback className="bg-primary text-primary-foreground text-xs">
//                     {getInitials(user.name)}
//                   </AvatarFallback>
//                 </Avatar>
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="end" className="w-56">
//               <DropdownMenuLabel>
//                 <div className="flex flex-col">
//                   <span>{user.name}</span>
//                   <span className="text-xs text-muted-foreground font-normal">
//                     {user.email}
//                   </span>
//                 </div>
//               </DropdownMenuLabel>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem onClick={() => navigate('/profile')}>
//                 Profile
//               </DropdownMenuItem>
//               <DropdownMenuItem onClick={() => navigate('/subscription')}>
//                 Subscription
//               </DropdownMenuItem>
//               <DropdownMenuItem onClick={() => navigate('/settings')}>
//                 Settings
//               </DropdownMenuItem>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem 
//                 onClick={logout}
//                 className="text-destructive focus:text-destructive"
//               >
//                 Sign out
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         ) : (
//           <Button onClick={() => navigate('/login')} size="sm">
//             Sign In
//           </Button>
//         )}
//       </div>

//       {/* Mobile search overlay */}
//       <AnimatePresence>
//         {isMobile && showSearch && (
//           <motion.div
//             initial={{ opacity: 0, y: -10 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -10 }}
//             className="absolute top-full left-0 right-0 p-4 bg-background border-b border-border"
//           >
//             <form onSubmit={handleSearch}>
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                 <Input
//                   type="search"
//                   placeholder="Search content, speakers, topics..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="pl-10"
//                   autoFocus
//                   aria-label="Search"
//                 />
//               </div>
//             </form>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </header>
//   );
// }
