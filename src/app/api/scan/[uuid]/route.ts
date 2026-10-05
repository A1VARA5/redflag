import {scanStatus} from '@/lib/urlscan'

// Proxies urlscan so the viewer's browser never talks to a third party: status as JSON, or ?img=1 for the screenshot.
export async function GET(req: Request, {params}: {params: Promise<{uuid: string}>}) {
  const {uuid} = await params
  if (!/^[0-9a-f-]{36}$/i.test(uuid)) return new Response('bad id', {status: 400})
  if (new URL(req.url).searchParams.get('img')) {
    const res = await fetch(`https://urlscan.io/screenshots/${uuid}.png`, {signal: AbortSignal.timeout(8000)})
    if (!res.ok) return new Response('not ready', {status: 404})
    return new Response(res.body, {headers: {'content-type': 'image/png', 'cache-control': 'public, max-age=86400'}})
  }
  return Response.json(await scanStatus(uuid), {headers: {'cache-control': 'no-store'}})
}
