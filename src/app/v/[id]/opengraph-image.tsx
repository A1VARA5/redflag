import {ImageResponse} from 'next/og'
import {loadVerdict} from '@/lib/store'

export const alt = 'Red Flag verdict'
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'

const WORD = {scam: 'This is a scam', suspicious: 'This looks suspicious', unclear: "We can't tell", safe: 'No red flags found'} as const
const COLOR = {scam: '#c8231a', suspicious: '#a15c07', unclear: '#44505f', safe: '#0f6b46'} as const
const BG = {scam: '#fdecea', suspicious: '#fff4e0', unclear: '#eef1f5', safe: '#e6f4ed'} as const

// The preview card in WhatsApp or iMessage carries the answer, so the person sees it before they even open the link.
export default async function Image({params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  const v = await loadVerdict(id)
  const word = v ? WORD[v.verdict] : 'Red Flag'
  const color = v ? COLOR[v.verdict] : '#d7261e'
  return new ImageResponse(
    (
      <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: v ? BG[v.verdict] : '#ffffff', padding: 64, color: '#0d1b2a', fontFamily: 'sans-serif', borderLeft: `24px solid ${color}`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 700}}>
          <div style={{width: 30, height: 30, background: '#0f2a47', borderRadius: 7}} />
          Red Flag checked this message
        </div>
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <div style={{fontSize: 96, fontWeight: 700, color, lineHeight: 1, letterSpacing: -2}}>{word}</div>
          {v && <div style={{fontSize: 44, fontWeight: 700, marginTop: 24, lineHeight: 1.2}}>{v.headline.slice(0, 110)}</div>}
        </div>
        <div style={{display: 'flex', fontSize: 28, color: '#5b554c'}}>{v?.verdict === 'scam' ? 'Do not reply, click or pay.' : 'Open to see the marked-up message and what to do.'}</div>
      </div>
    ),
    size,
  )
}
