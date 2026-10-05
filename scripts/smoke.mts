import {check} from '../src/lib/verdict.ts'
const msgs = [
  "Royal Mail: Your parcel could not be delivered due to an unpaid shipping fee of £1.45. Pay now to rearrange delivery: hxxps://royalmail-redelivery[.]info/track. Failure to pay within 24 hours will result in return to sender.",
  "Hi mum, this is my new number, my phone broke. Can you do me a favour, I need to pay a bill today and my banking app is locked. Don't tell dad yet x",
  "Hey, are we still on for football practice on Thursday at 6? Coach said bring water.",
]
for (const m of msgs) { const v = await check({text: m}); console.log(JSON.stringify({v: v.verdict, c: v.confidence, h: v.headline, p: v.pattern_id, hl: v.highlights.length, flags: v.red_flags.map(f=>f.quote), links: v.links.map(l=>[l.host, l.flags.map(f=>f.code)]), over: v.overrides, ms: v.ms, model: v.model})) }
