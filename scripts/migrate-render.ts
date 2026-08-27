import "dotenv/config";
import { migrateRenderDatabase } from "../server/renderDb";

migrateRenderDatabase()
  .then(() => {
    console.log("Render PostgreSQL schema is ready.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Failed to create Render PostgreSQL schema:", error);
    process.exit(1);
  });
