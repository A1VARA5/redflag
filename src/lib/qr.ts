// QR codes in screenshots. Fake parking meters, parcel cards and "scan to pay" posters hide the link in a QR code,
// so the person can't read the address before they open it. We read the code ourselves (plain code, no AI)
// and send the link through the same checks as any other link.
import sharp from 'sharp'
import jsQR from 'jsqr'
import {MAX_PIXELS} from './image'

export async function readQr(base64: string): Promise<string | null> {
  try {
    const {data, info} = await sharp(Buffer.from(base64, 'base64'), {limitInputPixels: MAX_PIXELS})
      .resize({width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true})
      .ensureAlpha()
      .raw()
      .toBuffer({resolveWithObject: true})
    const code = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), info.width, info.height)
    return code?.data?.trim() || null
  } catch {
    return null
  }
}
