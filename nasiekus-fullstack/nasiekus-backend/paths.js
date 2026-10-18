// paths.js
// Where the SQLite file and uploaded images live. Locally they sit next to
// the code (db/nasiekus.db and uploads/). On a server with a persistent disk
// (e.g. Render), point DATA_DIR (e.g. /var/data) at a writable directory so
// both survive deploys and instance restarts.
//
// If DATA_DIR is set but NOT usable — the classic case being /var/data on a
// Render free instance with no disk attached (needs a paid plan) — we log a
// loud warning and fall back to the in-repo location instead of crashing:
// a volatile database that boots beats a service that never opens its port.
const fs = require("fs");
const path = require("path");

function resolveBaseDir(){
  const dir = process.env.DATA_DIR || "";
  if (!dir) return "";
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return dir;
  } catch (e){
    console.warn(
      `WARNING: DATA_DIR "${dir}" is not usable (${e.code || e.message}). ` +
      `Falling back to the in-repo location — data will NOT persist across ` +
      `restarts. Attach a disk to the service (paid Render plan) or fix/remove the DATA_DIR env var.`
    );
    return "";
  }
}

const base = resolveBaseDir();

module.exports = {
  dbPath: base ? path.join(base, "nasiekus.db") : path.join(__dirname, "db", "nasiekus.db"),
  uploadsDir: base ? path.join(base, "uploads") : path.join(__dirname, "uploads")
};
