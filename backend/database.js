const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

let connectionString = (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");

// Remove channel_binding=require as Neon pooler / PgBouncer does not support SCRAM channel binding in node-postgres
if (connectionString.includes("channel_binding=require")) {
  connectionString = connectionString.replace(/([?&])channel_binding=require(&?)/g, (match, p1, p2) => {
    if (p1 === "?" && p2) return "?";
    if (p1 === "?" && !p2) return "";
    return "";
  });
  if (connectionString.endsWith("?") || connectionString.endsWith("&")) {
    connectionString = connectionString.slice(0, -1);
  }
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

module.exports = pool;