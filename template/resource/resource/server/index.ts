import { createDatabaseTables } from "@aicore-fivem/lib/server";
import { createLogger } from "@aicore-fivem/lib/shared";
import { ResourceName } from "common";

const log = createLogger(ResourceName);

createDatabaseTables(ResourceName, "sql/main.sql").catch((error: unknown) =>
  log.error("database setup failed", error),
);
