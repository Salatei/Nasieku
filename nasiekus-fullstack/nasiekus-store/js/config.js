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
