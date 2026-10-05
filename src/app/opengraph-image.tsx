import {ImageResponse} from 'next/og'

export const alt = 'Red Flag: is this message a scam?'
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f5f1e8', padding: 72, fontFamily: 'serif', color: '#16130f'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, fontSize: 34, fontFamily: 'sans-serif', fontWeight: 700}}>
          <div style={{width: 26, height: 34, background: '#d7261e', borderRadius: 4}} />
          Red Flag
        </div>
        <div style={{display: 'flex', flexDirection: 'column', fontSize: 92, lineHeight: 1.02}}>
          <span>Not sure about a message?</span>
          <span style={{color: '#d7261e'}}>Show it to Red Flag.</span>
        </div>
        <div style={{display: 'flex', fontSize: 30, fontFamily: 'sans-serif', color: '#5b554c'}}>Marks the words that give a scam away · checks every link · tells you what to do</div>
      </div>
    ),
    size,
  )
}
