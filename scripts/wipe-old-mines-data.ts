/**
 * Migration: Wipe old MineGame and ServerSecret data.
 * 
 * Old games used a flat 1.25× multiplier which doesn't match the new
 * mine-count-aware formula. This script clears all old data.
 * 
 * Run: npx tsx scripts/wipe-old-mines-data.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Wiping old Mines game data...\n");

  // 1. Delete all MineGame records
  const deletedGames = await prisma.mineGame.deleteMany({});
  console.log(`  ✓ Deleted ${deletedGames.count} MineGame records`);

  // 2. Delete all ServerSecret records
  const deletedSecrets = await prisma.serverSecret.deleteMany({});
  console.log(`  ✓ Deleted ${deletedSecrets.count} ServerSecret records`);

  // 3. Delete Mines-related transactions (BET and WIN for Mines)
  const deletedTransactions = await prisma.transaction.deleteMany({
    where: {
      OR: [
        { description: { contains: "Mines" } },
        { description: { contains: "mines" } },
      ],
    },
  });
  console.log(`  ✓ Deleted ${deletedTransactions.count} Mines-related transactions`);

  console.log("\n✅ Migration complete. All old Mines data has been removed.");
  console.log("   New games will use the updated multiplier formula.");
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
