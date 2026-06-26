"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard, Building2, Users, CalendarCheck,
  FileSpreadsheet, BookOpen, Bell, Settings, LogOut,
  Menu, X, ChevronRight, ShieldCheck, Network, HelpCircle, LifeBuoy
} from "lucide-react";
import type { UserRole } from "../../lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "Companies", href: "/companies", icon: Building2, roles: ["SUPER_ADMIN", "BD_TEAM"] },
  { label: "Teams", href: "/teams", icon: Network, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR"] },
  { label: "Users", href: "/users", icon: Users, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR"] },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "Leave Requests", href: "/leave-requests", icon: FileSpreadsheet, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "Training Plans", href: "/training-plans", icon: BookOpen, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "Notifications", href: "/notifications", icon: Bell, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "Support", href: "/support", icon: LifeBuoy, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
  { label: "Support Tickets", href: "/support-tickets", icon: ShieldCheck, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR"] },
  { label: "Audit Logs", href: "/audit-logs", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["SUPER_ADMIN"] },
  { label: "FAQ", href: "/faq", icon: HelpCircle, roles: ["SUPER_ADMIN", "BD_TEAM", "MENTOR", "STUDENT"] },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 px-5 border-b border-borderGray flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm shadow-sm">
            D+
          </div>
          <span className="font-bold text-text-primary text-lg tracking-tight">DevPlus</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 text-text-muted hover:text-text-primary hover:bg-bgInput rounded-lg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-text-muted hover:bg-bgInput hover:text-text-primary"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-brand" : "text-text-muted group-hover:text-text-primary")} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 text-brand" />}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-borderGray flex-shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-bgInput transition-colors">
          <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center text-brand text-xs font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{user?.name}</p>
            <p className="text-xs text-text-muted truncate">{user?.role?.replace("_", " ")}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-borderGray bg-white fixed top-0 left-0 bottom-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <aside
          className={cn(
            "absolute top-0 left-0 bottom-0 w-64 bg-white border-r border-borderGray transform transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}

function Header({
  onMenuClick,
  title,
  breadcrumb,
}: {
  onMenuClick: () => void;
  title: string;
  breadcrumb?: { label: string; href?: string }[];
}) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-borderGray px-4 md:px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-text-muted hover:text-text-primary hover:bg-bgInput rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-sm font-bold text-text-primary">{title}</h1>
          {breadcrumb && breadcrumb.length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-xs text-text-muted">
              <span>DevPlus</span>
              {breadcrumb.map((b, i) => (
                <React.Fragment key={i}>
                  <span>/</span>
                  {b.href ? (
                    <Link href={b.href} className="hover:text-brand transition-colors">{b.label}</Link>
                  ) : (
                    <span className="text-text-secondary font-medium">{b.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          className="relative p-2 text-text-muted hover:text-text-primary hover:bg-bgInput rounded-lg transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand animate-pulse" />
        </Link>
        <div className="h-5 w-px bg-borderGray" />
        <Link href="/settings" className="flex items-center gap-2 p-1.5 hover:bg-bgInput rounded-lg transition-colors">
          <div className="w-7 h-7 rounded-full bg-brand/15 flex items-center justify-center text-brand text-xs font-bold">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <span className="text-xs font-semibold text-text-primary hidden sm:block">{user?.name}</span>
        </Link>
      </div>
    </header>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumb?: { label: string; href?: string }[];
}

export function DashboardShell({ children, title, breadcrumb }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-bgPage flex">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header
          onMenuClick={() => setMobileOpen(true)}
          title={title}
          breadcrumb={breadcrumb}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
