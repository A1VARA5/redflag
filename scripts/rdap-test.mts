for (const d of ['bank.com','hermes.com']) {
  const t = Date.now()
  try { const r = await fetch(`https://rdap.org/domain/${d}`, {signal: AbortSignal.timeout(4000), headers: {accept: 'application/rdap+json'}}); console.log(d, r.status, r.url, Date.now()-t, 'ms', (await r.text()).slice(0,60)) } catch (e) { console.log(d, 'ERR', String(e), Date.now()-t) }
}
process.exit(0)
