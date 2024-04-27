import sql, { config } from "mssql";
import { type ExtenderCallback, Dag } from "@ts-dag/builder";
import { type StartedMSSQLServerContainer } from "@testcontainers/mssqlserver";

/**
 * MSSQL extender adds MSSQL connection to the context.
 * It first establishes a connection with the MSSQL server using the provided configuration.
 * Following extender pattern, it returns a clean up function which closes the connection.
 *
 * @param config - The configuration for the MSSQL server. It can be either a config object or a connection string.
 * @returns A callback function that when called, will close the established connection.
 *
 * @example - Using the MSSQL extender
 * ```ts
 * import { Dag } from "@ts-dag/builder";
 * import { extendWithMSSQL } from "./main";
 * import { type config as Config } from "mssql";
 *
 * const config: Config = {
 * // ...MSSQL configuration
 * }
 * const dag = new Dag().useContext({}).useExtender(extendWithMSSQL(config));
 *
 * const task = dag.task("test", async (ctx) => {
 *  return ctx.mssql.query`SELECT 1+1 as result`;
 * });
 * ```
 */
export const extendWithMSSQL =
  (config: config | string): ExtenderCallback =>
  async (ctx) => {
    const mssql = await sql.connect(config);
    ctx.mssql = mssql;

    return async () => mssql.close();
  };

/**
 * Interface representing the context with MSSQL.
 * Users extends their conext interface with the base context with a MSSQL connection pool.
 *
 */
export interface ContextWithMSSQL {
  mssql: sql.ConnectionPool;
}

if (import.meta.vitest) {
  const { describe, it, beforeAll, expect, afterAll } = import.meta.vitest;

  describe("MSSQL", async () => {
    const { MSSQLServerContainer } = await import(
      "@testcontainers/mssqlserver"
    );
    let container: StartedMSSQLServerContainer;
    let connString: string;

    beforeAll(async () => {
      container = await new MSSQLServerContainer().start();
      connString = container.getConnectionUri();
    }, 60000);

    afterAll(async () => {
      container.stop();
    });

    it("should extend context with mssql", async () => {
      const dag = new Dag<ContextWithMSSQL>()
        .useContext({})
        .useExtender(extendWithMSSQL(connString));

      const task = dag.task("test", async (ctx) => {
        const res = await ctx.mssql.query`SELECT 1+1 as result`;
        return res.recordset[0].result as number;
      });

      await dag.run();
      expect(task.output).toBe(2);
    });
  });
}
