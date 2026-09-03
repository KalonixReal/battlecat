import { db } from '../src/lib/db'
async function main() {
  const del = await db.leaderboardEntry.deleteMany({ where: { name: 'RATELIMIT-TEST' } })
  const remain = await db.leaderboardEntry.count()
  console.log('deleted:', del.count, 'remaining:', remain)
}
main().catch(e => { console.error(e); process.exit(1) })
