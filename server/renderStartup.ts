import { migrateRenderDatabase } from "./renderDb";

export async function initializeRenderDatabase() {
  await migrateRenderDatabase();
}
