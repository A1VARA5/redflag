// Registers the global commands (right-click "Red Flag this" and /redflag). Run once: npx tsx scripts/register-discord.mts
// Needs DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in the environment.
const app = process.env.DISCORD_APPLICATION_ID
const token = process.env.DISCORD_BOT_TOKEN
if (!app || !token) throw new Error('Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN')

// type 3 = message command (right-click a message). integration_types 0 = server install, 1 = user install,
// contexts 0/1/2 = servers, bot DMs, any DM or group DM. User install means it works everywhere, even in DMs from strangers.
const commands = [
  {name: 'Red Flag this', type: 3, integration_types: [0, 1], contexts: [0, 1, 2]},
  {
    name: 'redflag',
    type: 1,
    description: 'Check a message, link or screenshot for scams. Only you see the answer.',
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    // 3 = text, 11 = file
    options: [
      {type: 3, name: 'message', description: 'Paste the message or link', required: false, max_length: 4000},
      {type: 11, name: 'screenshot', description: 'Or add a screenshot', required: false},
    ],
  },
]

const res = await fetch(`https://discord.com/api/v10/applications/${app}/commands`, {
  method: 'PUT',
  headers: {Authorization: `Bot ${token}`, 'content-type': 'application/json'},
  body: JSON.stringify(commands),
})
console.log(res.status, await res.text())
