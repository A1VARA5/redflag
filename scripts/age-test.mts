import {inspectUrl} from '../src/lib/links.ts'
for (const u of `https://135461223.site/1990/27707926089121906-30390110286315/760405/x
https://135461223.site/1990/27707926089121906-30390110286315/760405
https://neu.planen.95-179-167-177.cpanel.site/de/update.php`.split('\n')) { const r = await inspectUrl(u); console.log(r.host, r.ageDays, r.registered, r.flags.map(f=>f.code+':'+f.severity).join(', ')) }
process.exit(0)
