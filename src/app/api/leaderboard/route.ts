import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Catclaw Dojo world ranking — GET top entries, POST a new run score.
// GET  /api/leaderboard?limit=20&stage=dojo
// POST /api/leaderboard { name, score, stage }

// Lightweight in-memory POST cap: per key (commander name + client IP), max 10 posts per 10 min.
// The game only posts on record-breaking runs, so legit players never hit it; it just stops spam floods.
const POST_WINDOW_MS = 10 * 60 * 1000
const POST_MAX = 10
const postLog = new Map<string, number[]>()

function postAllowed(key: string): boolean {
  const now = Date.now()
  const arr = (postLog.get(key) ?? []).filter((t) => now - t < POST_WINDOW_MS)
  if (arr.length >= POST_MAX) {
    postLog.set(key, arr)
    return false
  }
  arr.push(now)
  postLog.set(key, arr)
  if (postLog.size > 5000) {
    // opportunistic sweep so the map cannot grow unbounded in long-lived processes
    for (const [k, times] of postLog) {
      if (times.every((t) => now - t >= POST_WINDOW_MS)) postLog.delete(k)
    }
  }
  return true
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20))
    const stage = url.searchParams.get('stage') || undefined
    const entries = await db.leaderboardEntry.findMany({
      where: stage ? { stage } : undefined,
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      select: { id: true, name: true, score: true, stage: true, createdAt: true },
    })
    return NextResponse.json({ ok: true, entries })
  } catch {
    return NextResponse.json({ ok: false, error: 'db' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { name?: unknown; score?: unknown; stage?: unknown }
      | null
    if (!body) return NextResponse.json({ ok: false, error: 'bad body' }, { status: 400 })

    // hard validation — the client is a canvas game, treat everything as untrusted
    const nameRaw = typeof body.name === 'string' ? body.name.trim() : ''
    const name = (nameRaw || 'CAT COMMANDER').slice(0, 18)
    const scoreNum = Number(body.score)
    if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 1_000_000)
      return NextResponse.json({ ok: false, error: 'bad score' }, { status: 400 })
    const score = Math.floor(scoreNum)
    const stageRaw = typeof body.stage === 'string' ? body.stage.trim() : ''
    const stage = (stageRaw || 'dojo').slice(0, 32)

    // rate-limit: 10 posts per 10 min per name+IP (429 past that)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    if (!postAllowed(name + '|' + ip)) {
      return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 })
    }

    // only keep each commander's best run per stage (upsert-style: delete lower scores for same name+stage)
    const existing = await db.leaderboardEntry.findFirst({
      where: { name, stage },
      orderBy: [{ score: 'desc' }],
    })
    if (existing && existing.score >= score) {
      return NextResponse.json({ ok: true, kept: existing.score, entry: existing })
    }
    if (existing) {
      await db.leaderboardEntry.delete({ where: { id: existing.id } })
    }
    const entry = await db.leaderboardEntry.create({ data: { name, score, stage } })
    return NextResponse.json({ ok: true, entry })
  } catch {
    return NextResponse.json({ ok: false, error: 'db' }, { status: 500 })
  }
}
