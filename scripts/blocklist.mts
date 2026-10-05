import {buildBlocklist, isKnownPhish} from '../src/lib/feeds.ts'
const t = Date.now()
console.log(JSON.stringify(await buildBlocklist(), null, 1), (Date.now() - t) / 1000, 's')
const sample = (await (await fetch('https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt')).text()).split('\n')[3]
for (const u of [sample, 'https://www.google.com/', 'https://www.google.com/search?q=x', 'https://paypal.com/', 'https://www.amazon.co.uk/your-orders', 'https://sites.google.com/view/anything', 'https://royalmail.com/', 'https://vercel.app/', 'https://docs.google.com/forms/d/abc/viewform']) {
  const t2 = Date.now(); console.log(u.slice(0, 70), '->', await isKnownPhish([u]), Date.now() - t2, 'ms')
}
process.exit(0)
