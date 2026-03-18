'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Video,
  CalendarDays,
  BarChart2,
  Settings,
  Zap,
  LogOut,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/studio',    label: 'Studio',    icon: Video },
  { href: '/planner',   label: 'Planner',   icon: CalendarDays },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
];

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <Sidebar
      collapsible="none"
      className="border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]"
    >
      {/* Logo */}
      <SidebarHeader className="px-5 pt-6 pb-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'var(--accent-lime)',
              boxShadow: 'var(--shadow-lime)',
            }}
          >
            <Zap size={14} className="text-[#0f0f11]" />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="font-semibold text-[15px] tracking-[-0.02em] text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Creator
            </span>
            <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-medium mt-0.5">
              Studio
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Main nav */}
      <SidebarContent className="px-3 py-4">
        <p className="px-2 mb-2 text-[10px] font-semibold tracking-widest uppercase text-[var(--text-muted)]">
          Navigate
        </p>
        <SidebarMenu className="gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={[
                    'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg',
                    'text-[13.5px] font-medium transition-all duration-150 cursor-pointer h-auto',
                    active
                      ? 'bg-[var(--bg-raised)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]',
                  ].join(' ')}
                >
                  <Link href={href} className="flex items-center gap-3 w-full">
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
                        style={{
                          background: 'var(--accent-lime)',
                          boxShadow: '0 0 8px rgba(201,255,71,0.5)',
                        }}
                      />
                    )}
                    <Icon
                      size={16}
                      className="shrink-0 transition-colors duration-150"
                      style={{ color: active ? 'var(--accent-lime)' : undefined }}
                    />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Bottom: settings + user */}
      <SidebarFooter className="px-3 pb-4 pt-0">
        <SidebarSeparator className="mb-3" />
        <SidebarMenu className="gap-0.5 mb-4">
          {bottomItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={[
                    'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg',
                    'text-[13.5px] font-medium transition-all duration-150 cursor-pointer h-auto',
                    active
                      ? 'bg-[var(--bg-raised)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]',
                  ].join(' ')}
                >
                  <Link href={href} className="flex items-center gap-3 w-full">
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
                        style={{
                          background: 'var(--accent-lime)',
                          boxShadow: '0 0 8px rgba(201,255,71,0.5)',
                        }}
                      />
                    )}
                    <Icon
                      size={16}
                      className="shrink-0 transition-colors duration-150"
                      style={{ color: active ? 'var(--accent-lime)' : undefined }}
                    />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* User chip */}
        <div className="flex items-center gap-3 px-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent-lime) 0%, var(--accent-teal) 100%)',
              color: '#0f0f11',
            }}
          >
            U
          </div>
          <div className="flex flex-col leading-none min-w-0 flex-1">
            <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
              My Account
            </span>
            <span className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Free Plan
            </span>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
