'use client';
// src/app/app/support/SupportClient.tsx
// End-user support UI: ticket list + new-ticket form + two-way chat thread.
// Talks to /api/support and /api/support/:id (cookie session). Theming uses the
// deployed app's brand-tokens (--c-* vars) with hex fallbacks.

import React, { useCallback, useEffect, useState } from 'react';

interface Ticket {
  id: string; subject: string; status: string;
  created_at: string; last_message_at: string;
}
interface Message {
  id: string; author_kind: 'end_user' | 'operator';
  author_id: string | null; body: string; created_at: string;
}

const C = {
  text:    'var(--c-text, #e8e8f0)',
  text2:   'var(--c-text-2, #8B8B9F)',
  surface: 'var(--c-surface, #13131F)',
  surface2:'var(--c-surface-2, #1a1a26)',
  border:  'var(--c-border, #1E1E2E)',
  accent:  'var(--c-accent, #5fb6ff)',
  radius:  'var(--r, 8px)',
};

export function SupportClient(): React.ReactElement {
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject]   = useState('');
  const [draft, setDraft]       = useState('');
  const [reply, setReply]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/support', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setTickets(data.tickets ?? []);
    } catch { /* non-fatal */ }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/support/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setMessages(data.messages ?? []);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { void loadTickets(); }, [loadTickets]);
  useEffect(() => { if (activeId) void loadThread(activeId); }, [activeId, loadThread]);

  const openTicket = async () => {
    if (!subject.trim() || !draft.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body: draft }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? 'failed'); return; }
      setSubject(''); setDraft(''); setComposing(false);
      await loadTickets();
      setActiveId(data.ticket.id);
    } finally { setBusy(false); }
  };

  const sendReply = async () => {
    if (!activeId || !reply.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/support/${activeId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? 'failed'); return; }
      setReply('');
      await loadThread(activeId);
      await loadTickets();
    } finally { setBusy(false); }
  };

  const active = tickets.find(t => t.id === activeId) ?? null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 420 }}>
      {/* Ticket list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => { setComposing(true); setActiveId(null); }}
          style={{ ...btn, background: C.accent, color: '#fff', border: 'none' }}
        >
          + New ticket
        </button>
        {tickets.length === 0 && !composing && (
          <div style={{ color: C.text2, fontSize: 13, padding: '8px 4px' }}>No tickets yet.</div>
        )}
        {tickets.map(t => (
          <button
            key={t.id}
            onClick={() => { setComposing(false); setActiveId(t.id); }}
            style={{
              ...card,
              textAlign: 'left', cursor: 'pointer',
              borderColor: t.id === activeId ? C.accent : C.border,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 2, textTransform: 'capitalize' }}>{t.status} · {new Date(t.last_message_at).toLocaleDateString()}</div>
          </button>
        ))}
      </div>

      {/* Detail / compose */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {err && <div style={{ color: 'var(--c-danger, #ff6b6b)', fontSize: 12, marginBottom: 8 }}>Something went wrong ({err}).</div>}

        {composing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              style={input}
            />
            <textarea
              value={draft} onChange={e => setDraft(e.target.value)}
              placeholder="Describe your issue…" rows={6}
              style={{ ...input, resize: 'vertical' }}
            />
            <div>
              <button onClick={openTicket} disabled={busy || !subject.trim() || !draft.trim()} style={{ ...btn, background: C.accent, color: '#fff', border: 'none', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        ) : active ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{active.subject}</div>
            <div style={{ fontSize: 11, color: C.text2, marginBottom: 12, textTransform: 'capitalize' }}>{active.status}</div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {messages.map(m => {
                const mine = m.author_kind === 'end_user';
                return (
                  <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                    <div style={{
                      background: mine ? C.accent : C.surface2,
                      color: mine ? '#fff' : C.text,
                      border: mine ? 'none' : `1px solid ${C.border}`,
                      borderRadius: 10, padding: '8px 12px', fontSize: 13, whiteSpace: 'pre-wrap',
                    }}>{m.body}</div>
                    <div style={{ fontSize: 10, color: C.text2, marginTop: 2, textAlign: mine ? 'right' : 'left' }}>
                      {mine ? 'You' : 'Support'} · {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={reply} onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendReply(); } }}
                placeholder="Write a reply…" style={{ ...input, flex: 1 }}
              />
              <button onClick={sendReply} disabled={busy || !reply.trim()} style={{ ...btn, background: C.accent, color: '#fff', border: 'none', opacity: busy ? 0.6 : 1 }}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div style={{ color: C.text2, fontSize: 13, margin: 'auto' }}>Select a ticket or start a new one.</div>
        )}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 14,
};
const btn: React.CSSProperties = {
  borderRadius: C.radius, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--f-ui, inherit)',
};
const input: React.CSSProperties = {
  background: C.surface2, border: `1px solid ${C.border}`, borderRadius: C.radius,
  color: C.text, padding: '8px 12px', fontSize: 13, fontFamily: 'var(--f-ui, inherit)', outline: 'none',
};
