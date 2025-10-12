# Lifecycle Manager

Manages the clean startup and shutdown of a process. Register lifecycle nodes in the order they will be initialized, and then call `start()` on the lifecycle. When the lifecycle root node receives a SIGTERM or if the `close()` method is called, it will begin the shutdown process. The lifecycle root closes each node in the reverse order of their registration

## Usage

```ts
import { Lifecycle } from '@antman/lifecycle';

if (import.meta.main) {
  const lifecycle = newLifecycleRoot();
  lifecycle.all(console.log);
  lifecycle.register(db);
  lifecycle.register(webserver);
  lifecycle.register(outbox);
  await lifecycle.start();
}
```

Where each node is defined as a lifecycle node:

```ts
export const dbLifecycleNode = newNode(() => {
  let pool: Pool | undefined;
  return {
    name: 'DatabasePool',
    async start() {
      pool = new Pool({
        user: DB_USER,
        password: DB_HOST,
        host: DB_PASSWORD,
        port: DB_PORT,
      });
      await pool.query('SELECT 1');
    },
    close: () => pool.end(),
  }
})
```

Find more details in the [full documentation](https://jsr.io/@antman/lifecycle/doc)

## Nested Lifecycles

Sometimes, a lifecycle node needs to manage a subset of LifecycleNodes and their lifecycles. Every instance of LifecycleNode also provides a registerChildNode method and startChildNodes & closeChildNodes methods. Use these to register child lifecycle nodes, then start and close them during the startup and shutdown of the parent node.

For example:

```ts
const parentNode = newNode((internals) => ({
  async start(){
    internals.registerChildNode(childOne)
    internals.registerChildNode(childTwo)
    await internals.startChildNodes()
  }
  async close(){
    await internals.closeChildNodes();
  }
}));

const lifecycle = newLifecycleRoot(); 
lifecycle.register(parentNode)
await lifecycle.start();
```