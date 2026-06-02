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

function NavItem({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <a
      href={href}
      style={{
        display:        'block',
        padding:        '8px 14px',
        borderRadius:   'var(--r)',
        fontSize:       13,
        color:          active ? 'var(--c-text)' : 'var(--c-text-2)',
        background:     active ? 'var(--c-surface-2)' : 'transparent',
        borderLeft:     `3px solid ${active ? 'var(--c-accent)' : 'transparent'}`,
        textDecoration: 'none',
      }}
    >
      {label}
    </a>
  );
}

export function ManagementShellProvider({ user, availableRoles, appIdentity, children }: Props) {
  const identity = resolveAppIdentity(appIdentity);

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
        <NavItem href="/manage"                   label="Overview" />
        <NavItem href="/manage/customers"         label="Customers" />
        <NavItem href="/manage/providers"         label="Providers" />
        <NavItem href="/manage/ai-configuration"  label="AI configuration" />
        <NavItem href="/manage/email-invitations" label="Email & invitations" />
        <NavItem href="/manage/signup-policy"     label="Signup policy" />
        <NavItem href="/manage/auth-providers"    label="Auth providers" />
        <NavItem href="/manage/build-status"      label="Build status" />
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
