import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, Sun, Moon, X, Menu, Command } from "lucide-react";
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

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
    setShowMobileSearch(false);
  };

  useEffect(() => {
    if (showMobileSearch) searchInputRef.current?.focus();
  }, [showMobileSearch]);

  useEffect(() => {
    if (!showMobileSearch) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowMobileSearch(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showMobileSearch]);

  return (
    <header className={cn(
      "sticky top-0 z-30 h-[64px] w-full",
      "border-b border-border/40",
      "bg-background/80 backdrop-blur-[24px] supports-[backdrop-filter]:bg-background/60",
      "flex items-center gap-3 px-4 lg:px-6",
      "before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-border/50 before:to-transparent"
    )}>
      {onMenuClick && (
        <Button variant="ghost" size="icon" aria-label="Toggle sidebar" aria-expanded={ariaExpanded} aria-controls={ariaControls} onClick={onMenuClick} className="rounded-full w-9 h-9">
          <Menu className="w-[18px] h-[18px]" />
        </Button>
      )}

      {isMobile && (
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 rounded-[0.75rem] bg-foreground flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <img src={somLogo} alt="SOM" className="w-5 h-5 invert dark:invert-0" />
          </div>
          <span className="font-display text-[1.05rem] tracking-[-0.02em]">SOM</span>
        </Link>
      )}

      {!isMobile && (
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-[480px] relative group">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <Input type="search" placeholder="Search teachings, speakers, topics…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-10 pl-10 pr-[88px] rounded-full bg-secondary/60 border-border/60 focus-visible:bg-card focus-visible:border-foreground/15 focus-visible:ring-2 focus-visible:ring-foreground/10 transition-all text-[13.5px]" />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-card border border-border/60 shadow-sm">
              <span className="flex items-center gap-1 font-mono text-[10px] tracking-[0.05em] text-muted-foreground px-1.5">
                <Command className="w-3 h-3" />K
              </span>
            </div>
          </div>
        </form>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        {isMobile && (
          <Button variant="ghost" size="icon" aria-label="Toggle search" onClick={() => setShowMobileSearch(v => !v)} className="rounded-full w-9 h-9">
            {showMobileSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </Button>
        )}

        <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-full w-9 h-9 relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {theme === "dark" ? (
              <motion.div key="sun" initial={{ rotate: -90, opacity: 0, scale: 0.8 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.8 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
                <Sun className="w-4 h-4" />
              </motion.div>
            ) : (
              <motion.div key="moon" initial={{ rotate: 90, opacity: 0, scale: 0.8 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: -90, opacity: 0, scale: 0.8 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
                <Moon className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 relative" aria-label={`Notifications (${unreadCount} unread)`}>
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-foreground text-background text-[10px] font-[700] flex items-center justify-center shadow-[0_2px_8px_hsl(var(--foreground)/0.25)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-[1rem] p-2 shadow-[0_16px_40px_hsl(var(--foreground)/0.12)] border-border/50 bg-card/95 backdrop-blur-2xl">
            <DropdownMenuLabel className="font-display text-[1.05rem] px-3 py-2">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            {notifications.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No notifications — you're all caught up</div>}
            {notifications.slice(0, 5).map(n => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3 rounded-[0.75rem] focus:bg-secondary" onClick={() => n.actionUrl && navigate(n.actionUrl)}>
                <span className={cn("text-[13px] font-[600] tracking-[-0.01em]", !n.isRead && "text-foreground")}>{n.title}</span>
                <span className="text-[12px] text-muted-foreground line-clamp-1 leading-[1.4]">{n.message}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem className="justify-center rounded-full bg-foreground text-background focus:bg-foreground/90 focus:text-background font-[600] text-[13px] h-9 mt-1" onClick={() => navigate("/notifications")}>
              View all
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="rounded-full h-9 pl-1 pr-3 gap-2 border border-border/50 bg-card hover:bg-secondary shadow-sm">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-foreground text-background text-[11px] font-[700]">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-[13px] font-[600] tracking-[-0.01em] max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-[1rem] p-2 shadow-[0_16px_40px_hsl(var(--foreground)/0.12)] border-border/50 bg-card/95 backdrop-blur-2xl">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span className="font-[650] tracking-[-0.01em]">{user.name}</span>
                  <span className="text-[11px] font-mono tracking-[0.02em] text-muted-foreground">{user.email}</span>
                  <span className="mt-1 inline-flex w-fit px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground border border-accent/20 text-[10px] font-mono uppercase tracking-[0.1em]">{user.role}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-full">Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-full">Settings</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem onClick={logout} className="rounded-full text-destructive focus:text-destructive">Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" onClick={() => navigate("/login")} className="rounded-full h-9 px-4 bg-foreground text-background hover:bg-foreground/90 font-[600]">Sign in</Button>
        )}
      </div>

      <AnimatePresence>
        {isMobile && showMobileSearch && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="absolute top-full left-0 right-0 border-b border-border/50 bg-background/95 backdrop-blur-2xl p-4 shadow-lg">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input ref={searchInputRef} type="search" placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-11 pl-10 rounded-full bg-secondary border-border/60" />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
