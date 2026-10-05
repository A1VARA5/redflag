// Verdicts are saved so they can be shared as a link ("send this to Mum").
// Vercel Blob in production; a local folder in dev when no Blob token is set.
import {put, list} from '@vercel/blob'
import {promises as fs} from 'node:fs'
import path from 'node:path'
import type {Verdict} from './verdict'

const LOCAL = path.join(process.cwd(), '.verdicts')
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)

export async function saveVerdict(v: Verdict) {
  const json = JSON.stringify(v)
  if (useBlob()) {
    await put(`verdicts/${v.id}.json`, json, {access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true})
  } else {
    await fs.mkdir(LOCAL, {recursive: true})
    await fs.writeFile(path.join(LOCAL, `${v.id}.json`), json)
  }
}

export async function loadVerdict(id: string): Promise<Verdict | null> {
  if (!/^[a-f0-9]{12}$/.test(id)) return null
  try {
    if (useBlob()) {
      const {blobs} = await list({prefix: `verdicts/${id}.json`, limit: 1})
      if (!blobs[0]) return null
      const res = await fetch(blobs[0].url, {cache: 'no-store'})
      return res.ok ? ((await res.json()) as Verdict) : null
    }
    return JSON.parse(await fs.readFile(path.join(LOCAL, `${id}.json`), 'utf8')) as Verdict
  } catch {
    return null
  }
}
