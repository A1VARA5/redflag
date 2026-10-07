// Reached only when the phone shares to Red Flag before its service worker is running (the worker normally
// catches the share). The shared message is never put in a URL, so the person is asked to share again.
export function POST(req: Request) {
  return Response.redirect(new URL('/?shared=missing#check', req.url), 303)
}
