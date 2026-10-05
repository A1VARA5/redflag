import {ImageResponse} from 'next/og'

export const size = {width: 180, height: 180}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#16130f'}}>
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path d="M9 5v22" stroke="#f5f1e8" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M10.5 6.5c5-2.6 8.6 2.4 15 0v10c-6.4 2.4-10-2.6-15 0z" fill="#d7261e" />
        </svg>
      </div>
    ),
    size,
  )
}
