// Text from a PDF someone shares on the website, in Discord or in Telegram (fake invoices, "updated bank details"
// letters). Email attachments are read by Agentboxd instead.
// Reading runs in a separate worker thread that is killed at the time limit. PDF.js reads on the main thread
// otherwise, and a PDF built to be slow to parse would block the whole server, timers included.
import {Worker} from 'node:worker_threads'
import {createRequire} from 'node:module'
import path from 'node:path'

const MAX_PAGES = 20
const TIME_LIMIT_MS = 10_000

// Plain CommonJS, run with eval so the bundler leaves it alone. unpdf is loaded from node_modules
// (next.config.ts keeps it there for the server).
const WORKER = `
const {parentPort, workerData} = require('node:worker_threads')
;(async () => {
  const {getDocumentProxy} = require(workerData.unpdf)
  const pdf = await getDocumentProxy(new Uint8Array(workerData.bytes))
  let text = ''
  for (let n = 1; n <= Math.min(pdf.numPages, workerData.maxPages) && text.length < workerData.maxChars; n++) {
    const content = await (await pdf.getPage(n)).getTextContent()
    for (const item of content.items) if ('str' in item) text += item.str + (item.hasEOL ? '\\n' : ' ')
    text += '\\n'
  }
  parentPort.postMessage({text})
})().catch((e) => parentPort.postMessage({error: String((e && e.message) || e)}))
`

let unpdfPath: string | null = null
const unpdf = () => (unpdfPath ??= createRequire(path.join(process.cwd(), 'package.json')).resolve('unpdf'))

export async function pdfText(bytes: ArrayBuffer, maxChars = 20_000, limitMs = TIME_LIMIT_MS): Promise<string | null> {
  let worker: Worker
  try {
    worker = new Worker(WORKER, {
      eval: true,
      workerData: {unpdf: unpdf(), bytes, maxPages: MAX_PAGES, maxChars},
      resourceLimits: {maxOldGenerationSizeMb: 256},
    })
  } catch (e) {
    console.error('[pdf] worker did not start:', e instanceof Error ? e.message : e)
    return null
  }
  const text = await new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => {
      console.warn('[pdf] stopped after', limitMs, 'ms')
      resolve(null)
    }, limitMs)
    worker.once('message', (m: {text?: string; error?: string}) => {
      if (m.error) console.error('[pdf]', m.error)
      clearTimeout(timer)
      resolve(m.text ?? null)
    })
    worker.once('error', (e) => {
      console.error('[pdf] worker failed:', e.message)
      clearTimeout(timer)
      resolve(null)
    })
  })
  worker.terminate().catch(() => {})
  const clean = (text ?? '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  return clean ? clean.slice(0, maxChars) : null
}
