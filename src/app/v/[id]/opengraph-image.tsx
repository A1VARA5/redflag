import {ImageResponse} from 'next/og'
import {loadVerdict} from '@/lib/store'
import {VERDICT_BG, VERDICT_COLOR, VERDICT_TITLE} from '@/lib/labels'

export const alt = 'Red Flag verdict'
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'


// The preview card in WhatsApp or iMessage carries the answer, so the person sees it before they even open the link.
export default async function Image({params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  const v = await loadVerdict(id)
  const word = v ? VERDICT_TITLE[v.verdict] : 'Red Flag'
  const color = v ? VERDICT_COLOR[v.verdict] : '#c8231a'
  return new ImageResponse(
    (
      <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: v ? VERDICT_BG[v.verdict] : '#ffffff', padding: 64, color: '#0d1b2a', fontFamily: 'sans-serif', borderLeft: `24px solid ${color}`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 700}}>
          <div style={{width: 30, height: 30, background: '#0f2a47', borderRadius: 7}} />
          Red Flag checked this message
        </div>
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <div style={{fontSize: 96, fontWeight: 700, color, lineHeight: 1, letterSpacing: -2}}>{word}</div>
          {v && <div style={{fontSize: 44, fontWeight: 700, marginTop: 24, lineHeight: 1.2}}>{v.headline.slice(0, 110)}</div>}
        </div>
        <div style={{display: 'flex', fontSize: 28, color: '#5b554c'}}>{v?.verdict === 'scam' ? 'Do not reply, click or pay.' : 'Open it to see the marked words and what to do.'}</div>
      </div>
    ),
    size,
  )
}
