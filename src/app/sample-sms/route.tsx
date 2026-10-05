import {ImageResponse} from 'next/og'

// A made-up phone screenshot of a scam text, so people can see Red Flag read an image with one tap.
export const dynamic = 'force-static'

export function GET() {
  const bubble = (text: string) => (
    <div style={{display: 'flex', maxWidth: 560, background: '#e9e9eb', color: '#111', borderRadius: 26, padding: '18px 22px', fontSize: 27, lineHeight: 1.35, marginTop: 14}}>{text}</div>
  )
  return new ImageResponse(
    (
      <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', fontFamily: 'sans-serif'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '22px 36px 0', fontSize: 24, fontWeight: 700, color: '#111'}}>
          <span>09:41</span>
          <span>5G ▮▮▮</span>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '26px 0 22px', borderBottom: '1px solid #ddd'}}>
          <div style={{width: 78, height: 78, borderRadius: 39, background: '#9aa0a6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 34}}>E</div>
          <div style={{fontSize: 24, marginTop: 10, color: '#111'}}>+44 7700 900461</div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', padding: '20px 30px'}}>
          <div style={{display: 'flex', justifyContent: 'center', fontSize: 20, color: '#8e8e93', marginBottom: 6}}>Text Message · Today 08:12</div>
          {bubble('EVRI: We missed you today. Your parcel is being held at our depot due to an incomplete address.')}
          {bubble('To avoid it being returned, confirm your details and pay the £0.99 redelivery fee within 12 hours: https://evri-redelivery-uk.info/hold')}
          <div style={{display: 'flex', fontSize: 19, color: '#8e8e93', marginTop: 18}}>The sender is not in your contacts. Report Junk</div>
        </div>
      </div>
    ),
    {width: 750, height: 1100},
  )
}
