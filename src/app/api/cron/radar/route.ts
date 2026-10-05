import {buildRadar} from '@/lib/radar'

export const maxDuration = 120

// Vercel Cron calls this daily with "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('unauthorised', {status: 401})
  const r = await buildRadar()
  return Response.json({ok: true, scams: r.scams.length, items: r.itemCount, feeds: r.feeds})
}
