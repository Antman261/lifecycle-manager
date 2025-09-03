# Lifecycle Manager

Manages the clean startup and shutdown of a process. Register lifecycle components in the order they will be initialized, and then call `start()` on the lifecycle. When the lifecycle manager receives a SIGTERM or if the `close()` method is called, it will begin the shutdown process. The lifecycle manager closes each component in the reverse order of their registration

## Usage

```ts
import { Lifecycle } from '@antman/lifecycle';

if (import.meta.main) {
  const lifecycle = new Lifecycle();
  lifecycle.all(console.log);
  lifecycle.register(db);
  lifecycle.register(webserver);
  lifecycle.register(outbox);
  await lifecycle.start();
}
```

Where each component is defined as a lifecycle component, in one of two ways:

```ts
import { type LifecycleComponent } from '@antman/lifecycle';
import { Pool } from 'pg'

type Db = LifecycleComponent & { pool: Pool };

const { DB_USER, DB_HOST, DB_PASSWORD, DB_PORT } = Deno.env.toObject();

export const db: Db = {
  name: 'db',
  status: 'pending',
  pool: new Pool({
    user: DB_USER,
    password: DB_HOST,
    host: DB_PASSWORD,
    port: DB_PORT,
  }),
  async start() {
    // check database connected successfully
    await db.pool.query('SELECT 1');
    db.status = 'running';
  },
  async close() {
    await db.pool.end();
    db.status = 'pending'
  }
}
```

or 

```ts
class DatabasePool implements LifecycleComponent {
  readonly name: 'db';

}
export const db = new DatabasePool();
```

Find more details in the [full documentation](https://jsr.io/@antman/lifecycle/doc)