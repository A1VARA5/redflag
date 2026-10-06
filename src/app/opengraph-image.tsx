import {ImageResponse} from 'next/og'

export const alt = 'Red Flag: check a message before you click'
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff', padding: 72, fontFamily: 'sans-serif', color: '#0d1b2a', borderTop: '14px solid #0f2a47'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, fontSize: 36, fontWeight: 700}}>
          <div style={{width: 56, height: 56, borderRadius: 12, background: '#0f2a47', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{width: 22, height: 16, background: '#e5392f', borderRadius: 2, marginLeft: 6, marginTop: -10}} />
          </div>
          Red Flag
        </div>
        <div style={{display: 'flex', flexDirection: 'column', fontSize: 74, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2}}>
          <span>{"Got a message that doesn't feel right?"}</span>
          <span style={{color: '#0f2a47'}}>Check it before you click.</span>
        </div>
        <div style={{display: 'flex', fontSize: 28, color: '#44505f'}}>Google Safe Browsing · over 550,000 known phishing sites · the exact words that give it away</div>
      </div>
    ),
    size,
  )
}
