// Private Vercel Blob store in production (not reachable by URL, only through this app); a local folder in dev.
// Holds shared verdicts and the scam radar.
import {put, get} from '@vercel/blob'
import {promises as fs} from 'node:fs'
import path from 'node:path'
import type {Verdict} from './verdict'

const LOCAL = path.join(process.cwd(), '.data')
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)

export async function saveJson(key: string, value: unknown) {
  const json = JSON.stringify(value)
  if (blobEnabled()) {
    await put(key, json, {access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true})
  } else {
    const file = path.join(LOCAL, key)
    await fs.mkdir(path.dirname(file), {recursive: true})
    await fs.writeFile(file, json)
  }
}

export async function loadJson<T>(key: string): Promise<T | null> {
  try {
    if (blobEnabled()) {
      const res = await get(key, {access: 'private', useCache: false})
      if (!res || res.statusCode !== 200) return null
      return (await new Response(res.stream).json()) as T
    }
    return JSON.parse(await fs.readFile(path.join(LOCAL, key), 'utf8')) as T
  } catch {
    return null
  }
}

export const saveVerdict = (v: Verdict) => saveJson(`verdicts/${v.id}.json`, v)

export async function loadVerdict(id: string): Promise<Verdict | null> {
  if (!/^[a-f0-9]{12}$/.test(id)) return null
  return loadJson<Verdict>(`verdicts/${id}.json`)
}
