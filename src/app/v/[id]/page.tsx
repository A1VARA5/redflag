import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {loadVerdict} from '@/lib/store'
import {VerdictView} from '@/components/VerdictView'
import {VERDICT_SHORT} from '@/lib/labels'

export async function generateMetadata({params}: PageProps<'/v/[id]'>): Promise<Metadata> {
  const {id} = await params
  const v = await loadVerdict(id)
  if (!v) return {title: 'Red Flag'}
  return {title: `${VERDICT_SHORT[v.verdict]}: ${v.headline}`, description: v.summary, robots: {index: false}}
}

export default async function SharedVerdict({params}: PageProps<'/v/[id]'>) {
  const {id} = await params
  const v = await loadVerdict(id)
  if (!v) notFound()
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-2">Someone checked this message with Red Flag and wanted you to see the result.</p>
        <Link href="/" className="rounded-lg bg-navy px-4 py-2 text-[15px] font-semibold text-white hover:bg-navy-2">Check your own message</Link>
      </div>
      <VerdictView v={v} shared />
    </main>
  )
}
