// Public, intentionally non-secret configuration for the *disabled-by-default*
// Anthos account pilot. A publishable key is safe for browser clients; a
// service-role/secret key must never be returned from this endpoint.
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer"
};
export default async function handler(request) {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...headers, Allow: "GET" }
    });
  }
  const url = (process.env.SUPABASE_URL || "").trim();
  const publishableKey = (process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) &&
    publishableKey.startsWith("sb_publishable_");
  const enabled = process.env.ANTHOS_ACCOUNT_PILOT_ENABLED === "true" && configured;
  return new Response(JSON.stringify(enabled
    ? { enabled: true, supabaseUrl: url.replace(/\/$/, ""), publishableKey }
    : { enabled: false, message: "Private account pilot not yet available." }), {
    status: 200, headers
  });
}
