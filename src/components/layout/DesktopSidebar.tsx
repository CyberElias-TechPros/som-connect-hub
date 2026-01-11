import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Library, BookOpen, Users, User, Settings,
  ChevronLeft, ChevronRight, Shield, Upload, HelpCircle,
  Bell, CreditCard, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import somLogo from '@/images/som-logo.png';

interface DesktopSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const mainNavItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/library', icon: Library, label: 'Library' },
  { to: '/tools', icon: BookOpen, label: 'Daily Tools' },
  { to: '/community', icon: Users, label: 'Community' },
  { to: '/qa', icon: Users, label: 'Q&A Sessions' },
];

const accountNavItems = [
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/offline', icon: Download, label: 'Offline' },
  { to: '/subscription', icon: CreditCard, label: 'Subscription' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/help', icon: HelpCircle, label: 'Help & FAQ' },
];

export function DesktopSidebar({ collapsed, onCollapsedChange }: DesktopSidebarProps) {
  const location = useLocation();
  const { user, hasRole } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path || 
      (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border",
        "flex flex-col transition-all duration-300 z-40",
        collapsed ? "w-16" : "w-64"
      )}
      role="navigation"
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <img src={somLogo} alt="SOM Connect Logo" className="w-12 h-12 object-contain" />
              <span className="font-semibold text-sidebar-foreground">SOM CONNECT</span>
            </motion.div>
          )}
        </AnimatePresence>
         
        {collapsed && (
          <img src={somLogo} alt="SOM Connect Logo" className="w-12 h-12 object-contain" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-custom">
        <div className="px-3 mb-2">
          {!collapsed && (
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3">
              Main
            </span>
          )}
        </div>
        
        <ul className="space-y-1 px-3">
          {mainNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-sidebar-accent group",
                  isActive(item.to) 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground"
                )}
                title={collapsed ? item.label : undefined}
                aria-current={isActive(item.to) ? 'page' : undefined}
              >
                <item.icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive(item.to) && "text-sidebar-accent"
                )} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="font-medium truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Pastor Upload */}
        {hasRole(['pastor', 'admin']) && (
          <>
            <Separator className="my-4 mx-3" />
            <div className="px-3">
              <NavLink
                to="/upload"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-sidebar-accent group",
                  isActive('/upload') 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground"
                )}
                title={collapsed ? 'Upload Content' : undefined}
              >
                <Upload className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium truncate">Upload Content</span>
                )}
              </NavLink>
            </div>
          </>
        )}

        {/* Admin */}
        {hasRole(['admin']) && (
          <>
            <Separator className="my-4 mx-3" />
            <div className="px-3 mb-2">
              {!collapsed && (
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3">
                  Admin
                </span>
              )}
            </div>
            <div className="px-3">
              <NavLink
                to="/admin"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-sidebar-accent group",
                  isActive('/admin') 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground"
                )}
                title={collapsed ? 'Admin Dashboard' : undefined}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium truncate">Admin Dashboard</span>
                )}
              </NavLink>
            </div>
          </>
        )}

        <Separator className="my-4 mx-3" />
        
        <div className="px-3 mb-2">
          {!collapsed && (
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3">
              Account
            </span>
          )}
        </div>
        
        <ul className="space-y-1 px-3">
          {accountNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-sidebar-accent group",
                  isActive(item.to) 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn(
            "w-full justify-center",
            !collapsed && "justify-start"
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
