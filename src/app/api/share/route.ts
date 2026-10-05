import {verify} from '@/lib/sign'
import {saveVerdict} from '@/lib/store'
import type {Verdict} from '@/lib/verdict'

export async function POST(req: Request) {
  let body: {verdict?: Verdict; sig?: string}
  try {
    body = await req.json()
  } catch {
    return Response.json({error: 'Send JSON.'}, {status: 400})
  }
  if (!body.verdict || !body.sig || !verify(body.verdict, body.sig)) {
    return Response.json({error: 'This verdict was changed after Red Flag made it, so it cannot be shared.'}, {status: 400})
  }
  await saveVerdict(body.verdict)
  return Response.json({id: body.verdict.id, url: `/v/${body.verdict.id}`})
}
