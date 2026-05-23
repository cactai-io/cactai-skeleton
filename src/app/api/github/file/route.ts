// src/app/api/github/file/route.ts
// Fetches a single file's content from GitHub for the file view mode in the project tree.
// Returns decoded file content as a plain string.
// Protected: dev/collaborator only.

import { NextRequest, NextResponse } from 'next/server';
import { requireDevRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireDevRole();

    const path     = req.nextUrl.searchParams.get('path');
    const token    = process.env.GITHUB_TOKEN;
    const repoName = process.env.GITHUB_REPO_NAME;

    if (!path || !token || !repoName) {
      return NextResponse.json({ content: '' });
    }

    // Encode path segments individually so '/' separators stay literal.
    // GitHub's contents API accepts %2F but is non-idiomatic; segment-by-segment
    // encoding is the recommended form.
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');

    const res = await fetch(
      `https://api.github.com/repos/${repoName}/contents/${encodedPath}?ref=dev`,
      {
        headers: {
          Authorization:          `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          Accept:                 'application/vnd.github+json',
        },
      },
    );

    if (!res.ok) return NextResponse.json({ content: '' });
    const data = await res.json() as { content?: string; encoding?: string };

    const content = data.content && data.encoding === 'base64'
      ? Buffer.from(data.content, 'base64').toString('utf-8')
      : '';

    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: '' });
  }
}
