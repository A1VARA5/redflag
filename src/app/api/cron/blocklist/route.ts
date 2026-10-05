import {buildBlocklist} from '@/lib/feeds'

export const maxDuration = 300

// Daily: download five public phishing feeds, dedupe, split into 64 shards.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('unauthorised', {status: 401})
  return Response.json(await buildBlocklist())
}
