// src/lib/pendingFiles.test.ts
// Coverage for the shared validators that gate every /api/pending/* and
// /api/github/commit entrypoint. These are pure functions — no Supabase,
// no fetch, no globals — so the tests stay fast and assert behaviour the
// real route layer relies on.

import { describe, it, expect } from 'vitest';
import {
  isPendingOperation,
  isValidRepoPath,
  validatePendingFileInput,
  PENDING_OPERATIONS,
} from './pendingFiles';

const userId = '11111111-1111-1111-1111-111111111111';

const goodEdit = {
  path:             'src/app/page.tsx',
  operation:        'edit',
  new_path:         null,
  original_content: 'before',
  current_content:  'after',
  last_edited_at:   new Date().toISOString(),
  lines_added:      3,
  lines_removed:    1,
};

describe('isPendingOperation', () => {
  it.each(PENDING_OPERATIONS)('accepts %s', (op) => {
    expect(isPendingOperation(op)).toBe(true);
  });
  it.each([null, undefined, '', 'EDIT', 'unknown', 42, { kind: 'edit' }])(
    'rejects %p',
    (v) => { expect(isPendingOperation(v)).toBe(false); },
  );
});

describe('isValidRepoPath', () => {
  it.each([
    'src/index.ts',
    'a/b/c.d',
    'README.md',
    'src/lib/lens.ts',
  ])('accepts %s', (p) => { expect(isValidRepoPath(p)).toBe(true); });

  it.each([
    '',
    '/leading/slash.ts',
    'has//empty-segment.ts',
    './start-with-dot.ts',
    'a/../escape.ts',
    'has\0nul.ts',
    'a'.repeat(201),
    42,
    null,
  ])('rejects %p', (p) => { expect(isValidRepoPath(p)).toBe(false); });
});

describe('validatePendingFileInput — happy path', () => {
  it('accepts a well-formed edit', () => {
    const result = validatePendingFileInput(goodEdit, userId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.user_id).toBe(userId);
      expect(result.row.path).toBe('src/app/page.tsx');
      expect(result.row.operation).toBe('edit');
      expect(result.row.lines_added).toBe(3);
    }
  });

  it('accepts a rename when new_path is set', () => {
    const result = validatePendingFileInput(
      { ...goodEdit, operation: 'rename', new_path: 'src/app/home.tsx' },
      userId,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.operation).toBe('rename');
      expect(result.row.new_path).toBe('src/app/home.tsx');
    }
  });

  it('accepts a delete with current_content null', () => {
    const result = validatePendingFileInput(
      { ...goodEdit, operation: 'delete', current_content: null },
      userId,
    );
    expect(result.ok).toBe(true);
  });

  it('accepts a create with original_content null', () => {
    const result = validatePendingFileInput(
      { ...goodEdit, operation: 'create', original_content: null },
      userId,
    );
    expect(result.ok).toBe(true);
  });

  it('floors non-integer line counts', () => {
    const result = validatePendingFileInput(
      { ...goodEdit, lines_added: 3.7, lines_removed: 1.9 },
      userId,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.lines_added).toBe(3);
      expect(result.row.lines_removed).toBe(1);
    }
  });
});

describe('validatePendingFileInput — error paths', () => {
  it('rejects non-object payload', () => {
    const result = validatePendingFileInput('not an object', userId);
    expect(result.ok).toBe(false);
  });

  it('rejects path traversal', () => {
    const result = validatePendingFileInput(
      { ...goodEdit, path: 'src/../../etc/passwd' },
      userId,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/path/i);
    }
  });

  it('rejects unknown operation', () => {
    const result = validatePendingFileInput(
      { ...goodEdit, operation: 'mutate' },
      userId,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects rename without new_path', () => {
    const result = validatePendingFileInput(
      { ...goodEdit, operation: 'rename', new_path: null },
      userId,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/new_path is required/);
    }
  });

  it('rejects new_path on a non-rename/move operation', () => {
    const result = validatePendingFileInput(
      { ...goodEdit, operation: 'edit', new_path: 'src/other.ts' },
      userId,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/may only be set/);
    }
  });

  it('rejects delete with non-null current_content', () => {
    const result = validatePendingFileInput(
      { ...goodEdit, operation: 'delete', current_content: 'still here' },
      userId,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects negative line counts', () => {
    const result = validatePendingFileInput(
      { ...goodEdit, lines_added: -1 },
      userId,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects non-ISO last_edited_at', () => {
    const result = validatePendingFileInput(
      { ...goodEdit, last_edited_at: 'yesterday' },
      userId,
    );
    expect(result.ok).toBe(false);
  });
});
