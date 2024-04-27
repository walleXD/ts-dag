# DB Extenders

This package provides a set of extenders for the `@ts-dag/builder` package to work with databases. Currently, it only includes an extender for MSSQL.

## Installation

```bash
pnpm add @ts-dag/db-extenders mssql
# OR
npm install @ts-dag/db-extenders mssql
# OR
yarn add @ts-dag/db-extenders mssql
```

## Usage

### MSSQL Extender

The MSSQL extender adds a MSSQL connection to the context. It first establishes a connection with the MSSQL server using the provided configuration. Following the extender pattern, it returns a clean-up function which closes the connection.

```typescript
import { Dag } from "@ts-dag/builder";
import { extendWithMSSQL, type ContextWithMSSQL } from "@ts-dag/db-extenders";
import { config as Config } from "mssql";

const config: Config = {
  // ...MSSQL configuration
};

interface MyContext extends ContextWithMSSQL {
  // ...other context properties
}
const dag = new Dag<MyContext>()
  .useContext({})
  .useExtender(extendWithMSSQL(config));

const task = dag.task("test", async (ctx) => {
  return ctx.mssql.query`SELECT 1+1 as result`;
});
```

In the above example, `extendWithMSSQL` is used to add a MSSQL connection to the context. The `config` object is the configuration for the MSSQL server. It can be either a config object or a connection string.

## Interfaces

### ContextWithMSSQL

This interface represents the context with MSSQL. Users extend their context interface with the base context with a MSSQL connection pool.

```typescript
import { sql } from "mssql";
import { ContextWithMSSQL } from "@ts-dag/db-extenders";

interface MyContext extends ContextWithMSSQL {
  // ...other context properties
}
```

In the above example, `MyContext` is an interface that extends `ContextWithMSSQL`, adding a `mssql` property of type `sql.ConnectionPool` to the context.
