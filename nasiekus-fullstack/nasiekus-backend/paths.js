// paths.js
// Where the SQLite file and uploaded images live. Locally they sit next to
// the code (db/nasiekus.db and uploads/). On a server with a persistent disk
// (e.g. Render), set DATA_DIR (e.g. /var/data) so both survive deploys and
// instance restarts — otherwise every restart starts from an empty database.
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "";

module.exports = {
  dbPath: DATA_DIR ? path.join(DATA_DIR, "nasiekus.db") : path.join(__dirname, "db", "nasiekus.db"),
  uploadsDir: DATA_DIR ? path.join(DATA_DIR, "uploads") : path.join(__dirname, "uploads")
};
