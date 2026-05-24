// packages/mui/src/staging/PendingFilesManager.ts
//
// Client-side staging layer for the v1.2 commit-flow rebuild.
//
// Architecture:
//
//   - localStorage is the immediate, cross-tab-shared layer. Every edit
//     writes here synchronously so a tab refresh or a peer tab sees the
//     latest state without a round-trip.
//   - Supabase (via the skeleton's /api/pending/files route) is the
//     durable, cross-device layer. Writes are debounced — 30 seconds per
//     path, with a 240-second max-interval cap so a path being edited
//     continuously still flushes at least every four minutes.
//   - Discrete events (chat-side Author/Load, file upload, rename, delete)
//     bypass the debounce and flush immediately.
//   - On `visibilitychange: 'hidden'` and `beforeunload` the manager
//     attempts a best-effort `navigator.sendBeacon` flush so an edit-in-
//     flight at tab close doesn't get lost.
//   - The browser's `storage` event fires in this tab when a peer tab
//     writes to a key we share. The manager fans those events out to
//     per-path subscribers — Task 11's Monaco editor uses this to render
//     the cross-tab edit banner in the file currently open.
//
// Discard semantics by operation type (per the v1.2 Decisions block):
//
//   edit    — restore current_content := original_content; recompute
//             diff; with the diff necessarily zero, evict the row.
//   create  — remove the pending row entirely.
//   delete  — remove the pending row entirely.
//   rename  — remove the pending row entirely.
//   move    — same as rename.
//
// Auto-empty-diff revert detection: if a write ends with lines_added and
// lines_removed both zero (typically after an edit-then-revert), the row
// is evicted instead of flushed. This keeps pending_files free of empty
// rows that would otherwise survive until commit.
//
// Concurrency: per-path "flush in flight" latch. While a flush for path
// X is in flight, subsequent edits update localStorage and mark the row
// dirty; when the in-flight flush resolves, if the row is still dirty
// another flush is scheduled. This keeps server-side writes ordered per
// path even if the user types fast or a network round-trip is slow.
import { diffLines } from 'diff';
// ── Constants ───────────────────────────────────────────────────────────────
// Debounce window per path. After the last edit, wait this long before
// flushing to Supabase. Reset on every subsequent edit to the same path.
const DEBOUNCE_MS = 30_000;
// Max interval between flushes for a continuously dirty path. Even if
// edits keep coming and reset the debounce timer, a path that has been
// dirty for this long flushes anyway.
const MAX_INTERVAL_MS = 240_000;
// Prefix under which pending rows live in localStorage. The manager scopes
// each project under its own subprefix so two projects open in two tabs
// don't trample each other.
const LS_PREFIX = 'cactai_pending';
function lsKeyFor(projectId, path) {
    return `${LS_PREFIX}:${projectId}:${path}`;
}
function lsKeyPrefixFor(projectId) {
    return `${LS_PREFIX}:${projectId}:`;
}
// ── Diff helper ─────────────────────────────────────────────────────────────
//
// Line-count diff. Thread 10 wires the `diff` (jsdiff) library; we
// delegate to its `diffLines` here so the staging-layer counts shown
// in indicators and the row summaries in PendingEditsModal match the
// counts the rich DiffViewer renders. A single source of truth for
// "what changed" prevents the indicator and the diff body from
// disagreeing on a row.
//
// The numbers it returns:
//   lines_added   = count of lines marked `added` by diffLines.
//   lines_removed = count of lines marked `removed` by diffLines.
//
// Both zero means the two strings are line-by-line identical.
export function diffLineCounts(original, current) {
    // Newly created — every current line counts as added.
    if (original == null) {
        if (current == null || current === '')
            return { lines_added: 0, lines_removed: 0 };
        return { lines_added: countLines(current), lines_removed: 0 };
    }
    // Marked for delete — every original line counts as removed.
    if (current == null) {
        return { lines_added: 0, lines_removed: countLines(original) };
    }
    if (original === current)
        return { lines_added: 0, lines_removed: 0 };
    let added = 0, removed = 0;
    for (const change of diffLines(original, current)) {
        if (!change.added && !change.removed)
            continue;
        // jsdiff sets `count` to the number of lines in this change. When
        // it's absent (older builds), fall back to counting newlines in
        // the value.
        const n = change.count ?? change.value.split('\n').filter(s => s.length > 0).length;
        if (change.added)
            added += n;
        if (change.removed)
            removed += n;
    }
    return { lines_added: added, lines_removed: removed };
}
function countLines(s) {
    if (s === '')
        return 0;
    // A trailing newline doesn't add a line in the editor sense.
    return s.endsWith('\n') ? s.split('\n').length - 1 : s.split('\n').length;
}
// ── Manager ─────────────────────────────────────────────────────────────────
export class PendingFilesManager {
    projectId;
    fetchFn;
    now;
    // In-memory view. Source of truth in this tab. localStorage mirrors this
    // synchronously and Supabase is flushed in the background.
    rows = new Map();
    // Per-path debounce / in-flight bookkeeping.
    state = new Map();
    listeners = new Set();
    crossTabPaths = new Map();
    storageHandler = null;
    unloadHandlers = [];
    disposed = false;
    constructor(init) {
        this.projectId = init.projectId;
        this.fetchFn = init.fetchFn ?? ((...args) => fetch(...args));
        this.now = init.now ?? (() => Date.now());
        // Rehydrate from localStorage so a page refresh in this tab keeps the
        // pending state visible without waiting for the Supabase GET to
        // resolve. The Supabase fetch happens separately via hydrate().
        this.rehydrateFromLocalStorage();
        // Cross-tab: listen for peer writes to our project's keys.
        if (typeof window !== 'undefined') {
            this.storageHandler = (e) => this.onStorageEvent(e);
            window.addEventListener('storage', this.storageHandler);
            // Best-effort flush at tab close / hide. Both listeners are routed
            // through the same handler so the dispose cleanup can remove them
            // by reference.
            const flushBeacon = () => { this.beaconFlush(); };
            const onVisibility = () => {
                if (document.visibilityState === 'hidden')
                    flushBeacon();
            };
            window.addEventListener('beforeunload', flushBeacon);
            document.addEventListener('visibilitychange', onVisibility);
            this.unloadHandlers.push(() => window.removeEventListener('beforeunload', flushBeacon), () => document.removeEventListener('visibilitychange', onVisibility));
        }
    }
    // ── Public API ────────────────────────────────────────────────────────────
    /** Snapshot of all currently pending rows for this project. */
    getPendingFiles() {
        return Array.from(this.rows.values());
    }
    /** Look up a single row by path; null if nothing pending at that path. */
    getPendingFile(path) {
        return this.rows.get(path) ?? null;
    }
    /**
     * Stage a write. Updates localStorage and the in-memory view synchronously;
     * schedules a Supabase flush (debounced unless `opts.immediate`).
     *
     * For operation === 'delete' the caller passes content === null. For
     * operation === 'rename' / 'move' the caller passes opts.new_path and the
     * file's original content; current_content is the same content moved to
     * the new path.
     *
     * Callers MUST supply `opts.original_content` on the first edit to a
     * given path (it's the dev-branch content the local edit is diffing
     * against). On subsequent edits to the same path the manager preserves
     * the original_content already on the row — callers can omit
     * opts.original_content. For operation === 'create' the original_content
     * is null (the file doesn't exist on dev yet).
     *
     * Auto-empty-diff: if the resulting row has zero added and zero removed
     * lines AND the operation is 'edit', the path is discarded instead of
     * staged.
     */
    setPendingFile(path, content, opts) {
        if (this.disposed)
            return;
        const now = this.now();
        const existing = this.rows.get(path) ?? null;
        // Preserve original_content across edits in the same session: if the
        // caller passes it we trust them; otherwise we keep whatever the
        // existing row had (or null for a new create).
        const original_content = opts.original_content !== undefined
            ? opts.original_content
            : existing?.original_content ?? null;
        const current_content = opts.operation === 'delete' ? null : content;
        const diff = diffLineCounts(original_content, current_content);
        // Auto-empty-diff revert: for edits, if the content matches the
        // dev-branch original byte-for-byte, evict the row.
        if (opts.operation === 'edit'
            && original_content !== null
            && current_content !== null
            && diff.lines_added === 0
            && diff.lines_removed === 0) {
            this.discardPendingFile(path);
            return;
        }
        const row = {
            path,
            operation: opts.operation,
            new_path: opts.new_path ?? null,
            original_content,
            current_content,
            last_edited_at: new Date(now).toISOString(),
            lines_added: diff.lines_added,
            lines_removed: diff.lines_removed,
            is_new: opts.operation === 'create',
        };
        this.rows.set(path, row);
        this.writeLocalStorage(path, row);
        this.notifyListeners();
        // Schedule the Supabase flush. Discrete events bypass debounce.
        const st = this.getOrCreateState(path);
        if (st.firstDirtyAt === null)
            st.firstDirtyAt = now;
        if (opts.immediate) {
            this.cancelDebounce(path);
            void this.flushPath(path);
            return;
        }
        const dirtyFor = now - st.firstDirtyAt;
        if (dirtyFor >= MAX_INTERVAL_MS) {
            this.cancelDebounce(path);
            void this.flushPath(path);
            return;
        }
        this.scheduleDebounce(path);
    }
    /**
     * Discard a pending row. Per operation type:
     *   edit   — current_content := original_content; recompute diff;
     *            with diff zero, evict the row.
     *   create — remove the row entirely. (The file disappears from the
     *            tree from this client's perspective.)
     *   delete — remove the row entirely. (The file returns to clean state.)
     *   rename — remove the row. (File returns to its original path.)
     *   move   — same as rename.
     *
     * In every case the local state clears synchronously. The server-side
     * DELETE is serialized through the per-path in-flight latch: if a flush
     * is currently in flight for the same path, the DELETE waits for it to
     * resolve before going out. This prevents a race where the POST arrives
     * after the DELETE and resurrects the row on the server.
     */
    discardPendingFile(path) {
        if (this.disposed)
            return;
        const row = this.rows.get(path);
        if (!row)
            return; // nothing to do
        this.rows.delete(path);
        this.removeLocalStorage(path);
        this.cancelDebounce(path);
        this.notifyListeners();
        const st = this.getOrCreateState(path);
        // Free the dirty bookkeeping — we no longer care about flush timing.
        st.firstDirtyAt = null;
        st.debounceTimer = null;
        if (st.inFlight) {
            // Queue the DELETE behind the in-flight POST. Mark 'delete' even if
            // a 'flush' was already queued — discards always win.
            st.queued = 'delete';
            return;
        }
        void this.runServerDelete(path);
    }
    /** Discard every pending row. Used by the modal's "Discard all" affordance. */
    discardAll() {
        if (this.disposed)
            return;
        const paths = Array.from(this.rows.keys());
        for (const p of paths)
            this.discardPendingFile(p);
    }
    /**
     * Flush all dirty rows to Supabase right now. Returns a promise that
     * resolves when every in-flight flush has settled. Used by the commit
     * route before it constructs the multi-file commit body, and by callers
     * that need durability guarantees before a navigation.
     *
     * This does not include rows that are already clean (no debounce timer
     * pending). It only forces flushes for rows that are dirty.
     */
    async flushDirty() {
        if (this.disposed)
            return;
        const paths = [];
        for (const [path, st] of this.state.entries()) {
            if (st.firstDirtyAt !== null)
                paths.push(path);
        }
        await Promise.all(paths.map((p) => {
            this.cancelDebounce(p);
            return this.flushPath(p);
        }));
    }
    /**
     * Subscribe to every change in the pending set. The listener fires after
     * each set / discard with the full snapshot. The modal and the file
     * tree both use this so they re-render when pending rows arrive from
     * any source — including peer tabs via the storage event.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    /**
     * Subscribe to cross-tab writes for a specific path. The callback fires
     * when a peer tab updates the localStorage entry for this path; it
     * receives the new row (or null if the peer discarded) and the previous
     * row in this tab.
     *
     * Used by Task 11's Monaco editor to render the "This file is being
     * edited in another tab. Reload to see those changes or continue editing
     * here." banner when the path currently open in the editor is touched
     * by a peer.
     */
    subscribeCrossTab(path, listener) {
        let bucket = this.crossTabPaths.get(path);
        if (!bucket) {
            bucket = new Set();
            this.crossTabPaths.set(path, bucket);
        }
        bucket.add(listener);
        return () => {
            const b = this.crossTabPaths.get(path);
            if (!b)
                return;
            b.delete(listener);
            if (b.size === 0)
                this.crossTabPaths.delete(path);
        };
    }
    /**
     * Replace the in-memory view with the server's snapshot. Called once
     * on mount (the DevShell fetches /api/pending/files and hands the
     * result here) so a fresh browser sees rows committed from another
     * device.
     *
     * Server rows trump local — if the server says path X has operation
     * 'edit' with lines_added 12 but localStorage says lines_added 14, the
     * server number wins. The reverse (locally newer than server) is
     * tolerable: localStorage's row will trigger a flush at the next edit
     * and the server will be brought back into sync.
     */
    hydrate(serverRows) {
        if (this.disposed)
            return;
        this.rows.clear();
        for (const r of serverRows) {
            this.rows.set(r.path, r);
            this.writeLocalStorage(r.path, r);
        }
        this.notifyListeners();
    }
    /** Release listeners and timers. Used by tests and on unmount. */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const st of this.state.values()) {
            if (st.debounceTimer !== null)
                clearTimeout(st.debounceTimer);
        }
        this.state.clear();
        this.listeners.clear();
        this.crossTabPaths.clear();
        if (typeof window !== 'undefined' && this.storageHandler) {
            window.removeEventListener('storage', this.storageHandler);
            this.storageHandler = null;
        }
        for (const off of this.unloadHandlers)
            off();
        this.unloadHandlers = [];
    }
    // ── Internals ─────────────────────────────────────────────────────────────
    getOrCreateState(path) {
        let st = this.state.get(path);
        if (!st) {
            st = { firstDirtyAt: null, debounceTimer: null, inFlight: false, queued: null };
            this.state.set(path, st);
        }
        return st;
    }
    scheduleDebounce(path) {
        const st = this.getOrCreateState(path);
        if (st.debounceTimer !== null)
            clearTimeout(st.debounceTimer);
        st.debounceTimer = setTimeout(() => { void this.flushPath(path); }, DEBOUNCE_MS);
    }
    cancelDebounce(path) {
        const st = this.state.get(path);
        if (!st || st.debounceTimer === null)
            return;
        clearTimeout(st.debounceTimer);
        st.debounceTimer = null;
    }
    // Flush a single path's current in-memory row to Supabase. Returns when
    // the POST has resolved (or rejected — we swallow the rejection and
    // leave the row dirty so a subsequent flush retries).
    //
    // If a request is already in flight for this path, mark `queued: 'flush'`
    // and bail. The in-flight handler will drain the queue when it resolves.
    async flushPath(path) {
        if (this.disposed)
            return;
        const row = this.rows.get(path);
        if (!row)
            return;
        const st = this.getOrCreateState(path);
        if (st.inFlight) {
            // 'delete' beats 'flush' if both happen — never overwrite a queued
            // delete with a flush.
            if (st.queued !== 'delete')
                st.queued = 'flush';
            return;
        }
        st.inFlight = true;
        // Mark the row as clean optimistically; if the flush fails we restore
        // firstDirtyAt so a subsequent edit re-enters the debounce window.
        const wasFirstDirtyAt = st.firstDirtyAt;
        st.firstDirtyAt = null;
        st.debounceTimer = null;
        let succeeded = false;
        try {
            const res = await this.fetchFn('/api/pending/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: [serialize(row)] }),
                credentials: 'same-origin',
            });
            succeeded = res.ok;
            if (!res.ok) {
                // eslint-disable-next-line no-console
                console.warn('[staging] flush failed', path, res.status);
            }
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[staging] flush threw', path, err);
        }
        finally {
            st.inFlight = false;
            if (!succeeded) {
                // Restore the dirty marker so the next edit picks up where we
                // left off. If the path is no longer in this.rows (discarded
                // mid-flush) we don't care.
                if (this.rows.has(path))
                    st.firstDirtyAt = wasFirstDirtyAt ?? this.now();
            }
            this.drainQueued(path);
        }
    }
    // After an in-flight request resolves, run whatever the manager queued
    // during the request. Scheduled on a microtask via setTimeout(0) so the
    // event loop drains in case the row changed mid-request.
    drainQueued(path) {
        const st = this.state.get(path);
        if (!st || st.queued === null)
            return;
        const next = st.queued;
        st.queued = null;
        setTimeout(() => {
            if (this.disposed)
                return;
            if (next === 'flush')
                void this.flushPath(path);
            else
                void this.runServerDelete(path);
        }, 0);
    }
    // ── localStorage layer ────────────────────────────────────────────────────
    writeLocalStorage(path, row) {
        if (typeof localStorage === 'undefined')
            return;
        try {
            localStorage.setItem(lsKeyFor(this.projectId, path), JSON.stringify(serialize(row)));
        }
        catch {
            // QuotaExceeded or storage disabled — non-fatal. Supabase remains
            // the durable layer; localStorage is an accelerator.
        }
    }
    removeLocalStorage(path) {
        if (typeof localStorage === 'undefined')
            return;
        try {
            localStorage.removeItem(lsKeyFor(this.projectId, path));
        }
        catch { /* non-fatal */ }
    }
    rehydrateFromLocalStorage() {
        if (typeof localStorage === 'undefined')
            return;
        const prefix = lsKeyPrefixFor(this.projectId);
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(prefix))
                continue;
            const path = key.slice(prefix.length);
            const raw = localStorage.getItem(key);
            if (!raw)
                continue;
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && parsed.path === path) {
                    this.rows.set(path, parsed);
                }
            }
            catch { /* skip malformed entries */ }
        }
    }
    // The storage event fires only when *another* document writes to a key
    // shared with this document — our own writes don't trigger it. So when
    // this handler fires we're learning about a peer tab's update.
    onStorageEvent(e) {
        if (!e.key)
            return;
        const prefix = lsKeyPrefixFor(this.projectId);
        if (!e.key.startsWith(prefix))
            return;
        const path = e.key.slice(prefix.length);
        const prev = this.rows.get(path) ?? null;
        let next = null;
        if (e.newValue) {
            try {
                const parsed = JSON.parse(e.newValue);
                if (parsed && typeof parsed === 'object' && parsed.path === path) {
                    next = parsed;
                }
            }
            catch { /* malformed — treat as no value */ }
        }
        if (next) {
            this.rows.set(path, next);
        }
        else {
            this.rows.delete(path);
        }
        this.notifyListeners();
        const bucket = this.crossTabPaths.get(path);
        if (bucket)
            for (const cb of bucket) {
                try {
                    cb(next, prev);
                }
                catch { /* listener errors don't propagate */ }
            }
    }
    // ── Beacon flush (best-effort at tab close / hide) ────────────────────────
    beaconFlush() {
        if (this.disposed)
            return;
        const dirty = [];
        for (const [path, st] of this.state.entries()) {
            if (st.firstDirtyAt === null)
                continue;
            const row = this.rows.get(path);
            if (row)
                dirty.push(row);
        }
        if (dirty.length === 0)
            return;
        if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function')
            return;
        const body = JSON.stringify({ files: dirty.map(serialize) });
        // Use a Blob with the right MIME so the server sees JSON. sendBeacon
        // takes a string and queues it for delivery even after pagehide.
        try {
            const blob = new Blob([body], { type: 'application/json' });
            navigator.sendBeacon('/api/pending/flush', blob);
        }
        catch {
            // Beacon failure is silent by design — there's nothing we can do
            // about it at this point in the page lifecycle.
        }
    }
    // ── Server delete ─────────────────────────────────────────────────────────
    //
    // Runs the DELETE for a path that's already been removed locally.
    // Acquires the in-flight latch so this serializes correctly with any
    // POST that might land on the same path immediately after.
    async runServerDelete(path) {
        if (this.disposed)
            return;
        const st = this.getOrCreateState(path);
        if (st.inFlight) {
            // Caller should have queued; double-check defensively.
            if (st.queued !== 'delete')
                st.queued = 'delete';
            return;
        }
        st.inFlight = true;
        try {
            await this.fetchFn(`/api/pending/files/${encodeURIComponent(path)}`, {
                method: 'DELETE',
                credentials: 'same-origin',
            });
        }
        catch {
            // Discards are best-effort on the server; the local state has
            // already been cleared. If the server still has the row a peer
            // tab loading later will see a stale entry, but the next commit
            // (or an explicit flush) brings the server back into sync.
        }
        finally {
            st.inFlight = false;
            this.drainQueued(path);
        }
    }
    // ── Listener fanout ───────────────────────────────────────────────────────
    notifyListeners() {
        if (this.listeners.size === 0)
            return;
        const snap = this.getPendingFiles();
        for (const l of this.listeners) {
            try {
                l(snap);
            }
            catch { /* listener errors don't propagate */ }
        }
    }
}
// ── Wire serialization ──────────────────────────────────────────────────────
//
// Strip the optional convenience fields the server sets so the POST body
// is the canonical row shape. The server fills user_id from the session;
// is_new is derived from operation so we don't echo it.
function serialize(row) {
    return {
        path: row.path,
        operation: row.operation,
        new_path: row.new_path,
        original_content: row.original_content,
        current_content: row.current_content,
        last_edited_at: row.last_edited_at,
        lines_added: row.lines_added,
        lines_removed: row.lines_removed,
    };
}
// ── Singleton accessor ──────────────────────────────────────────────────────
//
// The DevShell owns at most one manager instance per project. Most call
// sites should construct via DevShell wiring and pass the manager via
// React context rather than reach for the singleton. The accessor exists
// for client-side surfaces that sit outside React's tree (e.g. the chat
// SSE handler that needs to call setPendingFile when a staged_file lands
// on a turn result) and for tests that want to inspect state across
// module boundaries.
let activeManager = null;
export function setActivePendingFilesManager(m) {
    activeManager = m;
}
export function getActivePendingFilesManager() {
    return activeManager;
}
//# sourceMappingURL=PendingFilesManager.js.map