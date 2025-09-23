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

Where each component is defined as a lifecycle component:

```ts
class DatabasePool extends LifecycleComponent {
  pool?: Pool;
  async start() {
    this.pool = new Pool({
      user: DB_USER,
      password: DB_HOST,
      host: DB_PASSWORD,
      port: DB_PORT,
    });
    await this.pool.query('SELECT 1');
  }
  async close(){
    await this.pool.end();
  }
  checkHealth: undefined; // Optionally, can implement a health check for a component.
}
export const db = new DatabasePool();
```

Find more details in the [full documentation](https://jsr.io/@antman/lifecycle/doc)

## Nested Lifecycles

Sometimes you m a lifecycle component to manage a set of LifecycleComponents and their lifecycles. Every instance of LifecycleComponent also provides a register method in addition to startChildren & closeChildren methods. Use these to register child lifecycle components as well as start and close them during the startup and shutdown of the parent component.