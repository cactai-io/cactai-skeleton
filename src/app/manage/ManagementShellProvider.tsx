// src/app/manage/ManagementShellProvider.tsx
// Management panel shell. Renders in the developer's brand-tokens theme
// (the developer in their own app, just on admin pages). Hosts:
//   - Sidebar navigation (Overview, Customers, Email Invitations, etc.)
//   - Header with notification bell (brand-tokens themed) and avatar menu
//   - Children slot for the actual page content
//
// Avatar menu:
//   - Manage (current — clicking does nothing, this is the current view)
//   - Open as role: each held tenant role opens an authentic lens tab via
//     window.open(`/app?lens=<role>`, `cactai-lens-<role>`)
//   - Theme switcher (light/dark/system)
//   - Account settings (links to cactai.io/settings — the platform dashboard)
//   - Sign out
//
// Notification bell reads from /api/notifications and uses brand-tokens
// throughout. The same NotificationBell component as the platform dashboard
// (theme-agnostic) wrapped with the developer's theme.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  NotificationBell,
  AvatarMenu,
  type ShellTokens,
  type MenuItem,
  type Notification,
} from '@cactai-io/shell-ui';
import { resolveAppIdentity, type AppIdentity } from '@cactai-io/brand-tokens';
import { lensFetch, openLensTab } from '@/lib/lens-tab';
import type { SessionUser } from '@/lib/auth';

interface Props {
  user:           SessionUser;
  /** Held tenant roles for the avatar menu's lens-tab items. */
  availableRoles: Array<{ role: string; label: string }>;
  /** App identity for the brand mark / app name in the header. */
  appIdentity:    Partial<AppIdentity> | null;
  children:       React.ReactNode;
}

// Brand-tokens-backed tokens for the shell-ui primitives. The developer's
// CSS variables resolve at render time.
const brandShellTokens: ShellTokens = {
  bg:         'var(--c-bg)',
  bgRaised:   'var(--c-surface)',
  border:     'var(--c-border)',
  text:       'var(--c-text)',
  textMuted:  'var(--c-text-2)',
  textSubtle: 'var(--c-text-3)',
  hoverBg:    'var(--c-surface-2)',
  focusRing:  'var(--c-accent)',
  info:       'var(--c-accent)',
  warning:    'var(--c-warm)',
  error:      'var(--c-danger)',
  blocking:   'var(--c-danger)',
  radius:     'var(--r)',
  font:       'var(--f-ui)',
};

// Stroke-icon paths for each management section (feather-style, 24 viewBox).
// Each section gets a distinct glyph; Overview is the single "home".
const NAV: Array<{ href: string; label: string; icon: string }> = [
  { href: '/manage',                   label: 'Overview',           icon: 'M3 12L12 4l9 8M5 10v10h14V10' },
  { href: '/manage/customers',         label: 'Customers',          icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { href: '/manage/providers',         label: 'Providers',          icon: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01' },
  { href: '/manage/ai-configuration',  label: 'AI configuration',   icon: 'M7 7h10v10H7zM9 3v2M15 3v2M9 19v2M15 19v2M5 9H3M5 15H3M21 9h-2M21 15h-2' },
  { href: '/manage/email-invitations', label: 'Email & invitations', icon: 'M4 4h16v16H4zM22 6l-10 7L2 6' },
  { href: '/manage/signup-policy',     label: 'Signup policy',       icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
  { href: '/manage/auth-providers',    label: 'Auth providers',      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { href: '/manage/build-status',      label: 'Build status',        icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
];

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: string; active?: boolean }) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        padding:        '8px 14px',
        borderRadius:   'var(--r)',
        fontSize:       13,
        color:          active ? 'var(--c-text)' : 'var(--c-text-2)',
        background:     active ? 'var(--c-surface-2)' : 'transparent',
        borderLeft:     `3px solid ${active ? 'var(--c-accent)' : 'transparent'}`,
        textDecoration: 'none',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
        <path d={icon} />
      </svg>
      {label}
    </a>
  );
}

export function ManagementShellProvider({ user, availableRoles, appIdentity, children }: Props) {
  const identity = resolveAppIdentity(appIdentity);
  const pathname = usePathname();

  // Active section: exact match for Overview (so "home" is exactly one place —
  // it never stays lit on a sub-route), prefix match for the rest so a deeper
  // path under a section keeps that section highlighted.
  const isActive = useCallback((href: string): boolean => {
    if (href === '/manage') return pathname === '/manage';
    return pathname === href || pathname.startsWith(href + '/');
  }, [pathname]);

  // Theme switcher: light / dark / system, persisted to localStorage and
  // applied via the data-theme attribute on documentElement.
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  useEffect(() => {
    const stored = (typeof window !== 'undefined') ? localStorage.getItem('cactai_theme') : null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') setTheme(stored);
  }, []);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('cactai_theme', theme);
  }, [theme]);

  // Notification bell callbacks. All routes go through lensFetch so the
  // X-Cactai-Lens header is included automatically when the tab carries a
  // lens override.
  const onFetch = useCallback(async (): Promise<Notification[]> => {
    const res = await lensFetch('/api/notifications');
    if (!res.ok) return [];
    const data = await res.json() as { notifications: Notification[] };
    return data.notifications;
  }, []);
  const onDismiss = useCallback(async (id: string) => {
    await lensFetch(`/api/notifications/${id}/dismiss`, { method: 'POST' });
  }, []);
  const onRetry = useCallback(async (id: string) => {
    const res = await lensFetch(`/api/notifications/${id}/retry`, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { detail?: string };
      throw new Error(body.detail ?? `status_${res.status}`);
    }
  }, []);

  // Avatar menu items: highest-level role current + lens tabs for held
  // tenant roles + theme + account + sign out. Per spec, each lens item
  // opens a NEW TAB (named-window pattern) so the management tab persists.
  const avatarItems: MenuItem[] = [
    { kind: 'section', label: 'Open as role' },
    ...availableRoles.map(r => ({
      kind: 'button' as const,
      label: r.label,
      onClick: () => openLensTab(r.role),
    })),
    { kind: 'divider' },
    { kind: 'section', label: 'Theme' },
    { kind: 'button', label: 'Light',  active: theme === 'light',  onClick: () => setTheme('light')  },
    { kind: 'button', label: 'Dark',   active: theme === 'dark',   onClick: () => setTheme('dark')   },
    { kind: 'button', label: 'System', active: theme === 'system', onClick: () => setTheme('system') },
    { kind: 'divider' },
    { kind: 'link', label: 'Cactai account ↗', href: 'https://cactai.io/settings', openInNewTab: true },
    { kind: 'divider' },
    { kind: 'button', label: 'Sign out', danger: true, onClick: async () => {
      // Sign out is handled by the skeleton's auth route. Calling the
      // Supabase client directly would skip any audit/cleanup we add here.
      await fetch('/auth/sign-out', { method: 'POST' });
      window.location.pathname = '/auth/login';
    } },
  ];

  // Brand mark: developer's logo if provided, otherwise the initial letter
  // on a gradient swatch drawn from the developer's theme.
  const brandMark = identity.logo_src ? (
    <img src={identity.logo_src} alt={identity.app_name} style={{ width: 28, height: 28, borderRadius: 6 }} />
  ) : (
    <div style={{
      width:           28,
      height:          28,
      borderRadius:    6,
      background:      `linear-gradient(135deg, var(--c-accent) 0%, var(--c-accent-2, var(--c-accent)) 100%)`,
      color:           '#fff',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      fontSize:        13,
      fontWeight:      700,
    }}>
      {identity.initial}
    </div>
  );

  const initials = (user.email ?? 'U').slice(0, 1).toUpperCase();

  return (
    <div style={{
      minHeight: '100vh',
      display:   'grid',
      gridTemplateColumns: '220px 1fr',
      fontFamily: 'var(--f-ui)',
      background: 'var(--c-bg)',
      color:      'var(--c-text)',
    }}>
      <nav style={{
        borderRight: '1px solid var(--c-border)',
        padding:     '20px 12px',
        display:     'flex',
        flexDirection: 'column',
        gap:         4,
      }}>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          gap:            10,
          padding:        '0 8px 16px',
          borderBottom:   '1px solid var(--c-border)',
          marginBottom:   12,
        }}>
          {brandMark}
          <div style={{ fontSize: 14, fontWeight: 600 }}>{identity.app_name}</div>
        </div>
        {NAV.map(item => (
          <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(item.href)} />
        ))}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          height:         52,
          borderBottom:   '1px solid var(--c-border)',
          background:     'var(--c-surface)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0 20px',
        }}>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)' }}>
            Manage
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationBell
              tokens={brandShellTokens}
              callbacks={{ onFetch, onDismiss, onRetry, onNavigate: (href) => { window.location.href = href; } }}
            />
            <AvatarMenu
              tokens={brandShellTokens}
              trigger={initials}
              items={avatarItems}
              header={user.email}
            />
          </div>
        </header>
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{children}</main>
      </div>
    </div>
  );
}
