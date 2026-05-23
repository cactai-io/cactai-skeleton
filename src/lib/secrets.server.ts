// src/lib/secrets.server.ts
//
// v1.3.5 — Envelope encryption for end-user BYOK secrets (v2 format).
//
// Mirror of the platform's apps/api/src/secrets.ts so the skeleton can write
// envelopes that the platform's embedding-resolver can decrypt. Format and
// algorithm are identical; the SECRETS_ENCRYPTION_KEY env var is the shared
// master key (KEK) that wraps each per-secret data key (DEK).
//
// Envelope format (v2):
//     v2.<wrappedDek>.<iv>.<authTag>.<ciphertext>
//   Fields (after the v2 marker), separated by '.' (not in base64 alphabet):
//     wrappedDek   — opaque base64 produced by KeyWrapper.wrap(dek)
//     iv           — base64 of the 12-byte random IV for the SECRET
//     authTag      — base64 of the 16-byte GCM auth tag for the SECRET
//     ciphertext   — base64 of the encrypted secret bytes
//
// KeyWrapper interface — KMS-ready:
//     wrap(dek: Buffer)  → Promise<string>     (opaque)
//     unwrap(wrapped)    → Promise<Buffer>     (raw DEK)
//   One implementation today: EnvKeyWrapper (uses SECRETS_ENCRYPTION_KEY).
//   Swap to a KmsKeyWrapper later by changing the single `keyWrapper` line.
//
// Fail-closed: throws on missing/malformed master key. The /api/settings/
// embeddings route lets that throw propagate as HTTP 500 rather than ever
// silently writing plaintext.

import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALG       = 'aes-256-gcm';
const IV_BYTES  = 12;
const TAG_BYTES = 16;
const DEK_BYTES = 32;
const ENVELOPE_VERSION = 'v2';
const ENVELOPE_SEPARATOR = '.';

export interface KeyWrapper {
  wrap(dek: Buffer): Promise<string>;
  unwrap(wrapped: string): Promise<Buffer>;
}

class EnvKeyWrapper implements KeyWrapper {
  async wrap(dek: Buffer): Promise<string> {
    const kek    = getMasterKey();
    const iv     = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALG, kek, iv);
    const enc    = Buffer.concat([cipher.update(dek), cipher.final()]);
    const tag    = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  async unwrap(wrapped: string): Promise<Buffer> {
    const kek = getMasterKey();
    const buf = Buffer.from(wrapped, 'base64');
    if (buf.length < IV_BYTES + TAG_BYTES + DEK_BYTES) {
      throw new Error('EnvKeyWrapper: wrapped DEK is too short');
    }
    const iv  = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const enc = buf.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv(ALG, kek, iv);
    decipher.setAuthTag(tag);
    const dek = Buffer.concat([decipher.update(enc), decipher.final()]);
    if (dek.length !== DEK_BYTES) {
      throw new Error('EnvKeyWrapper: unwrapped DEK has wrong length');
    }
    return dek;
  }
}

const keyWrapper: KeyWrapper = new EnvKeyWrapper();

function getMasterKey(): Buffer {
  const hex = process.env.SECRETS_ENCRYPTION_KEY;
  if (!hex) throw new Error('SECRETS_ENCRYPTION_KEY is not set');
  if (hex.length !== 64) throw new Error('SECRETS_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== 32) throw new Error('SECRETS_ENCRYPTION_KEY is not valid hex');
  return buf;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const dek    = randomBytes(DEK_BYTES);
  const iv     = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, dek, iv);
  const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  const wrappedDek = await keyWrapper.wrap(dek);
  return [
    ENVELOPE_VERSION,
    wrappedDek,
    iv.toString('base64'),
    tag.toString('base64'),
    enc.toString('base64'),
  ].join(ENVELOPE_SEPARATOR);
}

export async function decryptSecret(envelope: string): Promise<string> {
  if (typeof envelope !== 'string' || envelope.length === 0) {
    throw new Error('decryptSecret: empty input');
  }
  const parts = envelope.split(ENVELOPE_SEPARATOR);
  if (parts.length !== 5) {
    throw new Error('decryptSecret: invalid envelope (wrong field count)');
  }
  const [version, wrappedDek, ivB64, tagB64, encB64] = parts as [string, string, string, string, string];
  if (version !== ENVELOPE_VERSION) {
    throw new Error(`decryptSecret: unsupported envelope version "${version}"`);
  }
  const dek = await keyWrapper.unwrap(wrappedDek);
  if (dek.length !== DEK_BYTES) {
    throw new Error('decryptSecret: unwrapped DEK has wrong length');
  }
  const iv  = Buffer.from(ivB64,  'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  if (iv.length  !== IV_BYTES)  throw new Error('decryptSecret: bad IV length');
  if (tag.length !== TAG_BYTES) throw new Error('decryptSecret: bad auth tag length');
  const decipher = createDecipheriv(ALG, dek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

export function isEncrypted(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  const parts = value.split(ENVELOPE_SEPARATOR);
  if (parts.length !== 5) return false;
  if (parts[0] !== ENVELOPE_VERSION) return false;
  for (let i = 1; i < 5; i++) {
    if (!parts[i] || parts[i]!.length === 0) return false;
  }
  return true;
}
