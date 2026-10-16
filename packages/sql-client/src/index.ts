export type {
  SqlClient,
  SqlStatement,
  SqlExecMeta,
  SqlSelectResult,
  SqlRunResult,
} from "./ports";

// CF (D1) adapter is exported via the subpath `./adapters/cf-d1` so that
// Node consumers can import the port + better-sqlite3 adapter without
// pulling Cloudflare Worker types into their tsconfig. The CF worker
// imports stay as before:
//   import { CfD1SqlClient } from "@open-managed-agents/sql-client/adapters/cf-d1";

// better-sqlite3 adapter is lazy-loaded so that Postgres-only consumers
// never trigger a top-level import of better-sqlite3 (a native C++ addon
// requiring compilation). The function itself already dynamic-imports the
// driver; this wrapper avoids even parsing the adapter module at startup.
export async function createBetterSqlite3SqlClient(
  ...args: Parameters<
    typeof import("./adapters/better-sqlite3").createBetterSqlite3SqlClient
  >
): ReturnType<
  typeof import("./adapters/better-sqlite3").createBetterSqlite3SqlClient
> {
  const { createBetterSqlite3SqlClient: create } = await import(
    "./adapters/better-sqlite3"
  );
  return create(...args);
}
export { createPostgresSqlClient } from "./adapters/postgres";
