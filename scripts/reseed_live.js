const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host: process.env.DB_HOST || "172.18.0.1",
  port: 5432,
  database: "traillog",
  user: "traillog",
  password: "traillog",
});

const seedPath = process.argv[2] || path.join(__dirname, "..", "server", "itinerary_seed.json");
const d = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let n = 0;
    for (const it of d) {
      const gi = JSON.stringify({
        description: it.description || "",
        elevations: it.elevations || {},
        camps_info: it.camps_info || "",
        conservation: it.conservation || "",
      });
      await client.query(
        "UPDATE itineraries SET route_data = $1, global_info = $2 WHERE id = $3",
        [JSON.stringify(it.route_data), gi, it.id]
      );
      n++;
    }
    await client.query("COMMIT");
    console.log("Updated " + n + " itineraries");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error:", e.message);
  } finally {
    client.release();
    pool.end();
  }
})();
