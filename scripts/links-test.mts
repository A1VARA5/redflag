import {inspectUrl} from '../src/lib/links.ts'
const urls = ['https://model.com','https://bank.com','https://post.de','https://hermes.com','https://dpd.de','https://metal.com','https://purchase.com','https://www.evri.com/track','https://apple-id-verify.top/x','https://secure-hsbc-uk.com','https://dlscord-gift.com/claim','https://bookings.com','https://ing-veiligheid-nl.com/login','https://postnl-douane.info/betalen']
for (const u of urls) { const r = await inspectUrl(u); console.log(u.padEnd(40), '|', (r.brand ?? '-').padEnd(12), r.official ? 'official' : '', '|', r.flags.map(f=>f.code+':'+f.severity).join(', ')) }
process.exit(0)
