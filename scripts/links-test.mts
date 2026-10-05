import {inspectUrl} from '../src/lib/links.ts'
for (const u of ['https://metal.com','https://apple-id-verify.top/x','https://secure-hsbc-uk.com','https://www.evri.com/track','https://purchase.com','https://dlscord-gift.com/claim']) {
  const t = Date.now(); const r = await inspectUrl(u); console.log(u, '|', r.brand, r.official, '|', r.flags.map(f=>f.code).join(','), Date.now()-t, 'ms')
}
process.exit(0)
