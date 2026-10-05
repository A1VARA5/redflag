import {ImageResponse} from 'next/og'
import {loadVerdict} from '@/lib/store'

export const alt = 'Red Flag verdict'
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'

const WORD = {scam: 'SCAM', suspicious: 'SUSPICIOUS', unclear: "CAN'T TELL", safe: 'NO RED FLAGS FOUND'} as const
const COLOR = {scam: '#d7261e', suspicious: '#b86e00', unclear: '#4a5568', safe: '#2f6b4f'} as const

// The preview card in WhatsApp or iMessage carries the answer, so the person sees it before they even open the link.
export default async function Image({params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  const v = await loadVerdict(id)
  const word = v ? WORD[v.verdict] : 'RED FLAG'
  const color = v ? COLOR[v.verdict] : '#d7261e'
  return new ImageResponse(
    (
      <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f5f1e8', padding: 64, color: '#16130f', fontFamily: 'sans-serif', borderLeft: `24px solid ${color}`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 700}}>
          <div style={{width: 22, height: 30, background: '#d7261e', borderRadius: 4}} />
          Red Flag checked this message
        </div>
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <div style={{fontSize: word.length > 12 ? 104 : 150, fontFamily: 'serif', color, lineHeight: 1}}>{word}</div>
          {v && <div style={{fontSize: 44, fontWeight: 700, marginTop: 24, lineHeight: 1.2}}>{v.headline.slice(0, 110)}</div>}
        </div>
        <div style={{display: 'flex', fontSize: 28, color: '#5b554c'}}>{v?.verdict === 'scam' ? 'Do not reply, click or pay.' : 'Open to see the marked-up message and what to do.'}</div>
      </div>
    ),
    size,
  )
}
