'use client';
// src/app/app/SupportLauncher.client.tsx
// Minimal, self-contained support affordance for the deployed app's end users:
// a fixed launcher button → modal with a "create a ticket" form + two-way chat.
// Rendered by AppShellProvider so every Cactai app has support on day one; the
// developer can relocate the trigger into their own avatar menu (it's just a
// component). Talks to /api/support + /api/support/:id (cookie session).
//
// Chat transport: poll the open thread every ~8s while the modal is open — the
// cost-effective, no-persistent-connection method appropriate for low-frequency
// support. (Supabase Realtime is the live-push alternative if ever wanted.)

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Ticket { id: string; subject: string; status: string; created_at: string; last_message_at: string; }
interface Message { id: string; author_kind: 'end_user' | 'operator'; author_id: string | null; body: string; created_at: string; }

const C = {
  text: 'var(--c-text, #e8e8f0)', text2: 'var(--c-text-2, #8B8B9F)',
  surface: 'var(--c-surface, #13131F)', surface2: 'var(--c-surface-2, #1a1a26)',
  border: 'var(--c-border, #1E1E2E)', accent: 'var(--c-accent, #5fb6ff)', radius: 'var(--r, 8px)',
};

export function SupportLauncher(): React.ReactElement {
  const [open, setOpen]         = useState(false);
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject]   = useState('');
  const [draft, setDraft]       = useState('');
  const [reply, setReply]       = useState('');
  const [busy, setBusy]         = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTickets = useCallback(async () => {
    try { const r = await fetch('/api/support', { cache: 'no-store' }); const d = await r.json(); if (r.ok) setTickets(d.tickets ?? []); } catch { /* */ }
  }, []);
  const loadThread = useCallback(async (id: string) => {
    try { const r = await fetch(`/api/support/${id}`, { cache: 'no-store' }); const d = await r.json(); if (r.ok) setMessages(d.messages ?? []); } catch { /* */ }
  }, []);

  useEffect(() => { if (open) void loadTickets(); }, [open, loadTickets]);
  useEffect(() => { if (activeId) void loadThread(activeId); }, [activeId, loadThread]);

  // Poll the open thread for operator replies while the modal + a ticket are open.
  useEffect(() => {
    if (open && activeId) {
      pollRef.current = setInterval(() => { void loadThread(activeId); }, 8000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [open, activeId, loadThread]);

  const openTicket = async () => {
    if (!subject.trim() || !draft.trim()) return;
    setBusy(true);
    try {
      const r = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, body: draft }) });
      const d = await r.json(); if (!r.ok) return;
      setSubject(''); setDraft(''); setComposing(false); await loadTickets(); setActiveId(d.ticket.id);
    } finally { setBusy(false); }
  };
  const sendReply = async () => {
    if (!activeId || !reply.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/support/${activeId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: reply }) });
      if (r.ok) { setReply(''); await loadThread(activeId); await loadTickets(); }
    } finally { setBusy(false); }
  };

  const active = tickets.find(t => t.id === activeId) ?? null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Support"
        title="Support"
        style={{
          position: 'fixed', right: 20, bottom: 20, zIndex: 9000,
          background: C.accent, color: '#fff', border: 'none', borderRadius: 999,
          padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', fontFamily: 'var(--f-ui, inherit)',
        }}
      >
        Support
      </button>

      {open && (
        <div
          role="dialog" aria-modal="true" aria-label="Support"
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9001, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
            width: 'min(720px, 100%)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Support</div>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'transparent', border: 'none', color: C.text2, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12, padding: 16, minHeight: 360, flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
                <button onClick={() => { setComposing(true); setActiveId(null); }} style={{ ...btn, background: C.accent, color: '#fff', border: 'none' }}>+ New ticket</button>
                {tickets.length === 0 && !composing && <div style={{ color: C.text2, fontSize: 12, padding: '6px 2px' }}>No tickets yet.</div>}
                {tickets.map(t => (
                  <button key={t.id} onClick={() => { setComposing(false); setActiveId(t.id); }} style={{ ...card, textAlign: 'left', cursor: 'pointer', borderColor: t.id === activeId ? C.accent : C.border }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</div>
                    <div style={{ fontSize: 10.5, color: C.text2, marginTop: 2, textTransform: 'capitalize' }}>{t.status}</div>
                  </button>
                ))}
              </div>

              <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {composing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" style={input} />
                    <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Describe your issue…" rows={6} style={{ ...input, resize: 'vertical' }} />
                    <div><button onClick={openTicket} disabled={busy || !subject.trim() || !draft.trim()} style={{ ...btn, background: C.accent, color: '#fff', border: 'none', opacity: busy ? 0.6 : 1 }}>{busy ? 'Sending…' : 'Send'}</button></div>
                  </div>
                ) : active ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{active.subject}</div>
                    <div style={{ fontSize: 10.5, color: C.text2, marginBottom: 10, textTransform: 'capitalize' }}>{active.status}</div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                      {messages.map(m => {
                        const mine = m.author_kind === 'end_user';
                        return (
                          <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                            <div style={{ background: mine ? C.accent : C.surface2, color: mine ? '#fff' : C.text, border: mine ? 'none' : `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', fontSize: 13, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                            <div style={{ fontSize: 10, color: C.text2, marginTop: 2, textAlign: mine ? 'right' : 'left' }}>{mine ? 'You' : 'Support'} · {new Date(m.created_at).toLocaleString()}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendReply(); } }} placeholder="Write a reply…" style={{ ...input, flex: 1 }} />
                      <button onClick={sendReply} disabled={busy || !reply.trim()} style={{ ...btn, background: C.accent, color: '#fff', border: 'none', opacity: busy ? 0.6 : 1 }}>Send</button>
                    </div>
                  </>
                ) : (
                  <div style={{ color: C.text2, fontSize: 13, margin: 'auto' }}>Select a ticket or start a new one.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 12 };
const btn: React.CSSProperties = { borderRadius: C.radius, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--f-ui, inherit)' };
const input: React.CSSProperties = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: C.radius, color: C.text, padding: '8px 12px', fontSize: 13, fontFamily: 'var(--f-ui, inherit)', outline: 'none' };
