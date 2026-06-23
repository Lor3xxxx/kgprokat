// Выгрузка текущих данных из SQLite (prisma/dev.db) в JSON для заливки в Postgres.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";

const db = new DatabaseSync("prisma/dev.db");
const tables = ["User", "Category", "Equipment", "Unit", "Client", "Rental", "Setting"];
const out = {};
for (const t of tables) {
  out[t] = db.prepare(`SELECT * FROM "${t}"`).all();
  console.log(t, out[t].length);
}
fs.writeFileSync("prisma/seed-data.json", JSON.stringify(out));
console.log("written prisma/seed-data.json, size:", fs.statSync("prisma/seed-data.json").size);
db.close();
