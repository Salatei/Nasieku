/* ==========================================================================
   NASIEKU'S STORE — API configuration
   Change API_BASE if your backend runs somewhere other than localhost:4000
   (e.g. after deploying it) — every other file reads from this constant.
   ========================================================================== */
const API_BASE = "http://localhost:4000";

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
