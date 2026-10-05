import {buildRadar} from '../src/lib/radar.ts'
const r = await buildRadar()
console.log(r.headline); console.log(r.feeds); for (const s of r.scams) console.log('-', s.status, s.title, '|', s.pattern_id, '|', s.sources.map(x=>x.source).join(','))
process.exit(0)
