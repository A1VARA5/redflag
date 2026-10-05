// Which advice to show by default: the visitor's country from Vercel's edge, nothing stored.
const EU = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO CH'.split(' '))

export function GET(req: Request) {
  const c = (req.headers.get('x-vercel-ip-country') ?? '').toUpperCase()
  const region = ['GB', 'IM', 'JE', 'GG'].includes(c) ? 'UK' : EU.has(c) ? 'EU' : c ? 'US' : 'UK'
  return Response.json({country: c || null, region}, {headers: {'cache-control': 'private, no-store'}})
}
