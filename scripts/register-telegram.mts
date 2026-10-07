// Points the Telegram bot at this app and sets its commands. Run once after deploying:
// TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... npx tsx scripts/register-telegram.mts https://getredflag.vercel.app
const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const site = process.argv[2] ?? 'https://getredflag.vercel.app'
if (!token || !secret) throw new Error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET')

const call = async (method: string, body: object) => {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)})
  console.log(method, res.status, await res.text())
}

await call('setWebhook', {url: `${site}/api/telegram`, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: true})
await call('setMyCommands', {
  commands: [
    {command: 'check', description: 'Reply to a message with /check to check it for scams'},
    {command: 'help', description: 'How Red Flag works'},
  ],
})
await call('setMyDescription', {description: 'Got a message that doesn\'t feel right? Forward it here, or send a screenshot or PDF. Red Flag checks every link for real and shows the words that give a scam away. In groups, reply to a message with /check.'})
await call('setMyShortDescription', {short_description: 'Check a message before you click. Free scam checker.'})
