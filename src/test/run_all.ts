import * as fs from "fs"
import * as path from "path"
import { execSync } from "child_process"

const dir = __dirname
const files = fs
  .readdirSync(dir)
  .filter((f) => /^test_.*\.ts$/.test(f))
  .sort()

if (files.length === 0) {
  console.log("No test files found.")
  process.exit(0)
}

for (const file of files) {
  const fullPath = path.join(dir, file)
  console.log(`\n▶ Running ${file}`)
  try {
    execSync(`npx ts-node "${fullPath}"`, { stdio: "inherit" })
  } catch {
    console.error(`✗ ${file} failed`)
    process.exit(1)
  }
}

console.log("\n✓ All tests passed.")
