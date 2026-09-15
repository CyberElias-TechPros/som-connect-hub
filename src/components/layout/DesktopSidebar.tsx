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
  Search,
  Flame,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceType } from "@/hooks/use-mobile";
import somLogo from "@/images/som-logo.png";

interface DesktopSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const mainNavItems = [
  { to: "/", icon: Home, label: "Home", desc: "Overview" },
  { to: "/library", icon: Library, label: "Library", desc: "Teachings" },
  { to: "/tools", icon: BookOpen, label: "Daily Tools", desc: "Confessions" },
  { to: "/community", icon: Users, label: "Community", desc: "Connect" },
  { to: "/qa", icon: Search, label: "Q&A Sessions", desc: "Live" },
  { to: "/playlists", icon: List, label: "Playlists", desc: "Curated" },
  { to: "/favorites", icon: Heart, label: "Favorites", desc: "Saved" },
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
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/moderation", icon: Shield, label: "Moderation" },
];

function useIsActive(path: string) {
  const { pathname } = useLocation();
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function SidebarItem({
  to,
  icon: Icon,
  label,
  desc,
  collapsed,
  section,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  desc?: string;
  collapsed: boolean;
  section: string;
}) {
  const active = useIsActive(to);

  return (
    <NavLink
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5 transition-all duration-300",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
        active
          ? "bg-foreground text-background shadow-[0_4px_16px_hsl(var(--foreground)/0.15)]"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
      )}
    >
      {active && (
        <motion.div
          layoutId={`sidebar-dot-${section}`}
          className="absolute right-3 w-1.5 h-1.5 rounded-full bg-accent"
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        />
      )}
      <div className={cn(
        "w-8 h-8 rounded-[0.6rem] flex items-center justify-center shrink-0 transition-colors",
        active ? "bg-white/10" : "bg-secondary group-hover:bg-card border border-transparent group-hover:border-border/50"
      )}>
        <Icon className="h-[16px] w-[16px]" />
      </div>
      {!collapsed && (
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-[600] tracking-[-0.01em] truncate">{label}</span>
            {desc && !active && (
              <span className="hidden xl:inline font-mono text-[10px] tracking-[0.05em] uppercase opacity-60">{desc}</span>
            )}
          </div>
        </div>
      )}
    </NavLink>
  );
}

export function DesktopSidebar({ collapsed, onCollapsedChange }: DesktopSidebarProps) {
  const { user, hasRole } = useAuth();
  const { isDesktop } = useDeviceType();
  const expandedWidth = isDesktop ? 280 : 260;

  return (
    <aside
      className={cn(
        "sticky top-0 z-40 flex h-screen flex-col bg-card border-r border-border/50",
        "transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
      )}
      style={{ width: collapsed ? '72px' : `${expandedWidth}px` }}
      aria-label="Primary navigation"
    >
      {/* Header */}
      <div className="h-[64px] flex items-center gap-3 px-4 border-b border-border/50 shrink-0">
        <div className="w-9 h-9 rounded-[0.8rem] bg-foreground flex items-center justify-center shadow-sm shrink-0">
          <img src={somLogo} alt="SOM" className="w-5 h-5 invert dark:invert-0" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-[1.05rem] tracking-[-0.02em]">SOM CONNECT</span>
              <span className="font-mono text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">PRO</span>
            </div>
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-muted-foreground -mt-0.5">School of Ministry</div>
          </div>
        )}
        <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full ml-auto shrink-0" onClick={() => onCollapsedChange(!collapsed)}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Streak card */}
      {!collapsed && user && (
        <div className="p-3">
          <div className="rounded-[1rem] bg-gradient-to-br from-foreground to-foreground/80 text-background p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                <Flame className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="font-display text-[1.3rem] leading-none">{user.streak} days</div>
                <div className="font-mono text-[10px] tracking-[0.1em] uppercase opacity-70">Current streak</div>
              </div>
              <div className="ml-auto w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Sparkles className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
        <div className="px-3 space-y-6">
          <div>
            {!collapsed && <div className="px-3 pb-2 font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70">Discover</div>}
            <ul className="space-y-1">
              {mainNavItems.map(item => (
                <li key={item.to}>
                  <SidebarItem {...item} collapsed={collapsed} section="main" />
                </li>
              ))}
            </ul>
          </div>

          {hasRole(["pastor", "admin"]) && (
            <>
              <Separator className="bg-border/50" />
              <div>
                {!collapsed && <div className="px-3 pb-2 font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70">Creator</div>}
                <ul className="space-y-1">
                  <li>
                    <SidebarItem to="/upload" icon={Upload} label="Upload" desc="Content" collapsed={collapsed} section="creator" />
                  </li>
                </ul>
              </div>
            </>
          )}

          {hasRole(["admin"]) && (
            <>
              <Separator className="bg-border/50" />
              <div>
                {!collapsed && <div className="px-3 pb-2 font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70">Admin</div>}
                <ul className="space-y-1">
                  {adminNavItems.map(item => (
                    <li key={item.to}>
                      <SidebarItem {...item} collapsed={collapsed} section="admin" />
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <Separator className="bg-border/50" />
          <div>
            {!collapsed && <div className="px-3 pb-2 font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70">Account</div>}
            <ul className="space-y-1">
              {accountNavItems.map(item => (
                <li key={item.to}>
                  <SidebarItem {...item} collapsed={collapsed} section="account" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        {!collapsed ? (
          <div className="rounded-[0.9rem] bg-secondary/60 border border-border/50 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-[650] tracking-[-0.01em]">Upgrade to Premium</div>
              <div className="text-[11px] text-muted-foreground">Unlock all features</div>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 mx-auto rounded-full bg-accent/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
        )}
      </div>
    </aside>
  );
}
