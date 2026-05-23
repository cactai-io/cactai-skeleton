// src/app/_studio/preview/client.tsx
//
// Client half of the studio preview. Listens for `cactai:theme-delta`
// messages from the Theme Inspector and applies them to the document
// element as CSS custom properties.

'use client';

import { useEffect } from 'react';

interface ThemeDeltaMessage {
  type:  'cactai:theme-delta';
  path:  string;
  value: number | string;
  unit?: string;
}

// dotted token path → CSS custom property name.
// Matches the convention in src/lib/tokens.ts: dots and underscores both
// collapse to single dashes. e.g. "color.primary" → "--color-primary",
// "shadows.md" → "--shadows-md", "typography.fontSize.lg" → "--typography-fontSize-lg".
function pathToCssVar(path: string): string {
  return `--${path.replace(/[._]/g, '-')}`;
}

function isDeltaMessage(data: unknown): data is ThemeDeltaMessage {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as { type?: unknown; path?: unknown; value?: unknown; unit?: unknown };
  if (d.type !== 'cactai:theme-delta')   return false;
  if (typeof d.path !== 'string')        return false;
  if (typeof d.value !== 'string' && typeof d.value !== 'number') return false;
  if (d.unit !== undefined && typeof d.unit !== 'string')        return false;
  return true;
}

export function StudioPreviewClient() {
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Trusts messages from any origin because the preview is style-only —
      // a malicious message can at worst make this preview render
      // incorrectly. If preview responsibilities expand to include
      // interactive elements or data display, add origin filtering via
      // NEXT_PUBLIC_CACTAI_ORIGIN.
      if (!isDeltaMessage(e.data)) return;
      const { path, value, unit } = e.data;
      // Recompose value + unit for setProperty. CSS wants a single string
      // per custom property — `8px` not (8, 'px'). The unit, when present,
      // is appended to the value with no separator.
      const cssValue = unit ? `${value}${unit}` : String(value);
      document.documentElement.style.setProperty(pathToCssVar(path), cssValue);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <main style={{ padding: 32, fontFamily: 'var(--f-ui, var(--typography-fontFamily-base, system-ui))' }}>
      {/* Display heading — exercises --f-display + --c-text */}
      <h1 style={{
        fontFamily: 'var(--f-display, var(--typography-fontFamily-display, serif))',
        fontSize:   'var(--typography-fontSize-2xl, 32px)',
        color:      'var(--c-text, var(--color-text, #111))',
        margin:     '0 0 8px 0',
      }}>
        Display heading
      </h1>

      {/* Body copy — exercises UI font + secondary text token */}
      <p style={{
        fontFamily: 'var(--f-ui, var(--typography-fontFamily-base, system-ui))',
        fontSize:   'var(--typography-fontSize-base, 16px)',
        color:      'var(--c-text-2, var(--color-text-secondary, #555))',
        maxWidth:   560,
        margin:     '0 0 24px 0',
      }}>
        Body copy in UI font. This text uses the secondary text token so theme
        edits to text/text-2 are immediately visible side by side.
      </p>

      {/* Primary button — exercises accent + surface contrast */}
      <button style={{
        background:   'var(--c-accent, var(--color-accent, #FF4E6A))',
        color:        'var(--c-surface, var(--color-surface, #fff))',
        padding:      '10px 18px',
        borderRadius: 'var(--radii-md, 8px)',
        border:       '1px solid transparent',
        fontFamily:   'inherit',
        fontWeight:   600,
        cursor:       'pointer',
        boxShadow:    'var(--elev-1, var(--shadows-sm, 0 1px 2px rgba(0,0,0,0.08)))',
        marginRight:  12,
      }}>
        Primary button
      </button>

      {/* Secondary button — exercises border + text contrast */}
      <button style={{
        background:   'transparent',
        color:        'var(--c-text, var(--color-text, #111))',
        padding:      '10px 18px',
        borderRadius: 'var(--radii-md, 8px)',
        border:       '1px solid var(--c-border-med, var(--color-border, rgba(0,0,0,0.15)))',
        fontFamily:   'inherit',
        fontWeight:   500,
        cursor:       'pointer',
      }}>
        Secondary button
      </button>

      {/* Surface card — exercises surface + shadow */}
      <section style={{
        marginTop:     32,
        padding:       20,
        background:    'var(--c-surface, var(--color-surface, #fff))',
        border:        '1px solid var(--c-border, var(--color-border, rgba(0,0,0,0.09)))',
        borderRadius:  'var(--radii-lg, 12px)',
        boxShadow:     'var(--elev-2, var(--shadows-md, 0 4px 12px rgba(0,0,0,0.06)))',
        maxWidth:      560,
      }}>
        <h2 style={{
          fontFamily: 'var(--f-display, var(--typography-fontFamily-display, serif))',
          fontSize:   'var(--typography-fontSize-lg, 20px)',
          color:      'var(--c-text, var(--color-text, #111))',
          margin:     '0 0 6px 0',
        }}>
          Card title
        </h2>
        <p style={{
          color:      'var(--c-text-2, var(--color-text-secondary, #555))',
          margin:     0,
          fontSize:   'var(--typography-fontSize-sm, 14px)',
        }}>
          Cards exercise the surface, border, shadow, and text-on-surface
          tokens at once.
        </p>
      </section>

      {/* Inline code sample — exercises mono font + surface-2 */}
      <pre style={{
        marginTop:    24,
        padding:      '12px 16px',
        background:   'var(--c-surface-2, var(--color-surface-2, #f5f5f5))',
        borderRadius: 'var(--radii-md, 8px)',
        fontFamily:   'var(--f-mono, var(--typography-fontFamily-mono, monospace))',
        fontSize:     'var(--typography-fontSize-sm, 13px)',
        color:        'var(--c-text, var(--color-text, #111))',
        maxWidth:     560,
        overflow:     'auto',
      }}>{`const greeting = 'Hello, world';`}</pre>

      {/* Accent strip — exercises sunset gradient */}
      <div style={{
        marginTop:    24,
        height:       6,
        borderRadius: 999,
        background:   'var(--gradient-brand-cta, var(--gradient-ember, linear-gradient(135deg, #FF8A3C, #FF6A5C)))',
        maxWidth:     560,
      }} />

      {/* Transition demo — hovers exercise --d-base / --ease */}
      <a
        href="#"
        onClick={e => e.preventDefault()}
        style={{
          display:       'inline-block',
          marginTop:     24,
          color:         'var(--c-accent, var(--color-accent, #FF4E6A))',
          textDecoration: 'none',
          fontWeight:    500,
          transition:    'opacity var(--d-base, var(--transitions-base, 250ms)) var(--ease, ease-out)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.6'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
      >
        Hover link →
      </a>
    </main>
  );
}
