import {buildBlocklist} from '@/lib/feeds'

export const maxDuration = 300

// Daily: download five public phishing feeds, dedupe, split into 64 shards.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('unauthorised', {status: 401})
  return Response.json(await buildBlocklist())
}
