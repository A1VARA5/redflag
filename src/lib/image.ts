// Screenshots arrive from the web, email and Discord in any size. Claude takes images up to 5 MB and 8000 px a
// side, and a tiny file can still decode to a huge bitmap, so everything goes through here first.
import sharp from 'sharp'

export const MAX_PIXELS = 40_000_000
type Img = {mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'; data: string}

export async function normaliseImage(img: Img): Promise<Img | null> {
  try {
    const buf = Buffer.from(img.data, 'base64')
    const meta = await sharp(buf, {limitInputPixels: MAX_PIXELS}).metadata()
    const big = buf.length > 3_500_000 || (meta.width ?? 0) > 4000 || (meta.height ?? 0) > 7500
    if (!big) return img
    const out = await sharp(buf, {limitInputPixels: MAX_PIXELS})
      .resize({width: 1600, height: 7000, fit: 'inside', withoutEnlargement: true})
      .jpeg({quality: 85})
      .toBuffer()
    return {mediaType: 'image/jpeg', data: out.toString('base64')}
  } catch {
    return null
  }
}
