// Cloudflare Pages Function: protects /teacher with a shared username + password.
// Credentials are NOT in this repository. Set them in Cloudflare:
//   Workers & Pages > (project) > Settings > Variables and Secrets
//   TEACHER_USER and TEACHER_PASS (type: Secret)

function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (url.pathname.replace(/\/+$/, "") !== "/teacher") return next();

  if (!env.TEACHER_USER || !env.TEACHER_PASS) {
    return new Response("Teacher access is not set up yet.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const header = request.headers.get("Authorization") || "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try { decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0))); } catch (e) { /* bad header */ }
    const i = decoded.indexOf(":");
    if (i >= 0 && safeEqual(decoded.slice(0, i), env.TEACHER_USER) && safeEqual(decoded.slice(i + 1), env.TEACHER_PASS)) {
      // Serve the same page; the page itself switches on teacher mode when the path is /teacher.
      const res = await env.ASSETS.fetch(new Request(url.origin + "/"));
      const headers = new Headers(res.headers);
      headers.set("Cache-Control", "private, no-store");
      return new Response(res.body, { status: 200, headers });
    }
  }

  return new Response("Teachers only.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Teachers", charset="UTF-8"', "Cache-Control": "no-store" }
  });
}
