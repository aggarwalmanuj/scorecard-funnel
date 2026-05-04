import { readFileSync } from "node:fs"
import { CosmosClient } from "@azure/cosmos"

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const client = new CosmosClient({ endpoint: env.COSMOS_ENDPOINT, key: env.COSMOS_KEY })

const databasesToInspect = ["test", "funnel-db"]

for (const dbName of databasesToInspect) {
  console.log(`\n############ DATABASE: ${dbName} ############`)
  const db = client.database(dbName)
  let prompts
  try {
    prompts = db.container("prompts")
    const { resources: allKeys } = await prompts.items
      .query("SELECT c.id FROM c")
      .fetchAll()
    console.log(`Keys (${allKeys.length}):`, allKeys.map((k) => k.id))
  } catch (e) {
    console.log(`(could not read prompts container in ${dbName}: ${e?.message ?? e})`)
    continue
  }

  const { resources } = await prompts.items
    .query("SELECT c.id, c[\"value\"] FROM c WHERE STARTSWITH(c.id, 'questions_') OR STARTSWITH(c.id, 'question')")
    .fetchAll()

  for (const row of resources) {
    console.log(`\n=== ${row.id} ===`)
    try {
      const parsed = JSON.parse(row.value)
      console.log(JSON.stringify(parsed, null, 2))
    } catch {
      console.log(row.value)
    }
  }
}
