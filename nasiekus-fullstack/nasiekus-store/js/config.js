/* ==========================================================================
   NASIEKU'S STORE — API configuration
   API_BASE is chosen automatically: pages served locally (localhost /
   127.0.0.1 / file://) talk to the local backend on :4000, anything deployed
   (Vercel) talks to the production API on Render. Every other file reads
   from this constant.
   ========================================================================== */
const LOCAL_API_BASE = "http://localhost:4000";
const PROD_API_BASE = "https://nasieku.onrender.com";

const _host = window.location.hostname;
const API_BASE = (!_host || _host === "localhost" || _host === "127.0.0.1" || _host === "0.0.0.0")
  ? LOCAL_API_BASE
  : PROD_API_BASE;

function apiUrl(path){
  return API_BASE + path;
}

// apiFetch — fetch() with patient retries for GET/HEAD requests.
// The Render free instance sleeps after ~15 min idle; its first request
// takes 30-60s (the edge may even answer without CORS headers while it
// wakes, which the browser reports as an opaque network error). Retrying
// across that window turns a scary "can't reach the server" failure into a
// slow-but-working page load.
// Non-idempotent methods (POST/PUT/...) are NOT auto-retried — a retry
// could duplicate an order or an M-Pesa STK push if the first request
// actually landed and only the response was lost.
async function apiFetch(path, options){
  const url = apiUrl(path);
  const method = ((options && options.method) || "GET").toUpperCase();
  const canRetry = method === "GET" || method === "HEAD";
  const delays = canRetry ? [0, 3000, 6000, 10000, 15000] : [0];
  let lastErr = null;
  for (let i = 0; i < delays.length; i++){
    if (delays[i]) await new Promise(r => setTimeout(r, delays[i]));
    try{
      const res = await fetch(url, options);
      // A 5xx usually means the instance was mid-restart — retry GETs.
      if (res.status >= 500 && i < delays.length - 1){
        lastErr = new Error("Server error " + res.status);
        continue;
      }
      return res;
    }catch(err){
      lastErr = err; // network failure / missing CORS headers (cold start)
      if (!canRetry) throw err;
    }
  }
  throw lastErr || new Error("API unreachable");
}

function authHeaders(){
  const token = localStorage.getItem("nasiekus_token");
  return token ? { "Authorization": "Bearer " + token } : {};
}

function getStoredUser(){
  try{ return JSON.parse(localStorage.getItem("nasiekus_user") || "null"); }
  catch(e){ return null; }
}

function setSession(token, user){
  localStorage.setItem("nasiekus_token", token);
  localStorage.setItem("nasiekus_user", JSON.stringify(user));
}

function clearSession(){
  localStorage.removeItem("nasiekus_token");
  localStorage.removeItem("nasiekus_user");
}
