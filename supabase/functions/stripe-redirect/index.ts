import "@supabase/functions-js/edge-runtime.d.ts"

const ALLOWED_DESTINATIONS: Record<string, string> = {
  'return':  'xprohub://stripe-return',
  'refresh': 'xprohub://stripe-refresh',
}

Deno.serve((req: Request): Response => {
  const url = new URL(req.url)
  const type = url.searchParams.get('type')

  const destination = type ? ALLOWED_DESTINATIONS[type] : null

  if (!destination) {
    return new Response('Invalid redirect type', { status: 400 })
  }

  const html = `<!DOCTYPE html>
<html><head>
  <meta http-equiv="refresh" content="0;url=${destination}">
</head><body>
  <script>window.location.href="${destination}";</script>
  <p>Redirecting to XProHub...</p>
</body></html>`

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
})
