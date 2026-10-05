// Verdicts are saved so they can be shared as a link ("send this to Mum").
// Private Vercel Blob store in production (not reachable by URL, only through this app); a local folder in dev.
import {put, get} from '@vercel/blob'
import {promises as fs} from 'node:fs'
import path from 'node:path'
import type {Verdict} from './verdict'

const LOCAL = path.join(process.cwd(), '.verdicts')
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)

export async function saveVerdict(v: Verdict) {
  const json = JSON.stringify(v)
  if (useBlob()) {
    await put(`verdicts/${v.id}.json`, json, {access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true})
  } else {
    await fs.mkdir(LOCAL, {recursive: true})
    await fs.writeFile(path.join(LOCAL, `${v.id}.json`), json)
  }
}

export async function loadVerdict(id: string): Promise<Verdict | null> {
  if (!/^[a-f0-9]{12}$/.test(id)) return null
  try {
    if (useBlob()) {
      const res = await get(`verdicts/${id}.json`, {access: 'private'})
      if (!res || res.statusCode !== 200) return null
      return (await new Response(res.stream).json()) as Verdict
    }
    return JSON.parse(await fs.readFile(path.join(LOCAL, `${id}.json`), 'utf8')) as Verdict
  } catch {
    return null
  }
}
