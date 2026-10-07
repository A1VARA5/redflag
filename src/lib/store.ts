// Private Vercel Blob store in production (not reachable by URL, only through this app); a local folder in dev.
// Holds shared verdicts and the scam radar.
import {put, get, list} from '@vercel/blob'
import {promises as fs} from 'node:fs'
import path from 'node:path'
import type {Verdict} from './verdict'

const LOCAL = path.join(process.cwd(), '.data')
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)

const SAFE_KEY = /^[a-z0-9_-]+(\/[a-z0-9_-]+)*\.json$/i
function localPath(key: string): string {
  if (!SAFE_KEY.test(key)) throw new Error(`Bad storage key: ${JSON.stringify(key)}`)
  return path.join(LOCAL, ...key.split('/'))
}

export async function saveJson(key: string, value: unknown) {
  if (!SAFE_KEY.test(key)) throw new Error(`Bad storage key: ${JSON.stringify(key)}`)
  const json = JSON.stringify(value)
  if (blobEnabled()) {
    await put(key, json, {access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true})
  } else {
    const file = localPath(key)
    await fs.mkdir(path.dirname(file), {recursive: true})
    await fs.writeFile(file, json)
  }
}

// Missing files come back as null. With strict, any other failure (storage down, a cut-off file) throws instead,
// so a caller can tell "not there" from "couldn't read it" and not cache an empty answer.
export async function loadJson<T>(key: string, {strict = false} = {}): Promise<T | null> {
  try {
    if (blobEnabled()) {
      const res = await get(key, {access: 'private', useCache: false})
      if (!res || res.statusCode !== 200) return null
      return (await new Response(res.stream).json()) as T
    }
    return JSON.parse(await fs.readFile(localPath(key), 'utf8')) as T
  } catch (e) {
    if (strict && (e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    return null
  }
}

// Keys under a folder, e.g. listKeys('meter/2026-10-08/').
export async function listKeys(prefix: string): Promise<string[]> {
  if (blobEnabled()) {
    const keys: string[] = []
    let cursor: string | undefined
    do {
      const page = await list({prefix, cursor, limit: 1000})
      keys.push(...page.blobs.map((b) => b.pathname))
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
    return keys
  }
  const dir = path.join(LOCAL, ...prefix.split('/').filter(Boolean))
  const files = await fs.readdir(dir).catch(() => [] as string[])
  return files.map((f) => `${prefix}${f}`)
}

export const saveVerdict =(v: Verdict) => saveJson(`verdicts/${v.id}.json`, v)

export async function loadVerdict(id: string): Promise<Verdict | null> {
  if (!/^[a-f0-9]{12}$/.test(id)) return null
  return loadJson<Verdict>(`verdicts/${id}.json`)
}
