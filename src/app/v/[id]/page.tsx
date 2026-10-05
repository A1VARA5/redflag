import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {loadVerdict} from '@/lib/store'
import {VerdictView} from '@/components/VerdictView'
import {Flag} from '@/components/Flag'

const WORD = {scam: 'Scam', suspicious: 'Suspicious', unclear: "Can't tell", safe: 'No red flags found'} as const

export async function generateMetadata({params}: PageProps<'/v/[id]'>): Promise<Metadata> {
  const {id} = await params
  const v = await loadVerdict(id)
  if (!v) return {title: 'Red Flag'}
  return {title: `${WORD[v.verdict]}: ${v.headline}`, description: v.summary, robots: {index: false}}
}

export default async function SharedVerdict({params}: PageProps<'/v/[id]'>) {
  const {id} = await params
  const v = await loadVerdict(id)
  if (!v) notFound()
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Flag /> Red Flag
        </a>
        <a href="/" className="rounded-full bg-red px-4 py-2 text-sm font-semibold text-white">Check your own message</a>
      </header>
      <p className="pt-4 pb-5 text-ink-2">Someone checked this message with Red Flag and wanted you to see the result.</p>
      <VerdictView v={v} shared />
    </main>
  )
}
