import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Receives WAV/JSON assets from the offline bake pass (/game/bake.html) and
// writes them into public/game/assets/audio/ so the shipped game plays
// pre-rendered audio with zero runtime synthesis. Local sandbox tooling only.
const DIR = path.join(process.cwd(), 'public', 'game', 'assets', 'audio');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name: string = body?.name ?? '';
    const b64: string = body?.b64 ?? '';
    if (!/^[a-z0-9_]+\.(wav|json)$/.test(name) || typeof b64 !== 'string' || b64.length < 16 || b64.length > 90_000_000) {
      return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 });
    }
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 8) return NextResponse.json({ ok: false, error: 'empty payload' }, { status: 400 });
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(path.join(DIR, name), buf);
    return NextResponse.json({ ok: true, name, bytes: buf.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const files = await fs.readdir(DIR);
    const out: Record<string, number> = {};
    for (const f of files) {
      const st = await fs.stat(path.join(DIR, f));
      out[f] = st.size;
    }
    return NextResponse.json({ ok: true, dir: 'public/game/assets/audio', files: out });
  } catch {
    return NextResponse.json({ ok: true, dir: 'public/game/assets/audio', files: {} });
  }
}
