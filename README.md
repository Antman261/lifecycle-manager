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
}
export const db = new DatabasePool();
```

Find more details in the [full documentation](https://jsr.io/@antman/lifecycle/doc)

## Nested Lifecycles

Sometimes, a lifecycle component needs to manage a subset of LifecycleComponents and their lifecycles. Every instance of LifecycleComponent also provides a registerChildComponent method and startChildComponents & closeChildComponents methods. Use these to register child lifecycle components, then start and close them during the startup and shutdown of the parent component.

For example:

```ts
const parentComponent = new (class ParentComponent extends LifecycleComponent {
  async start(){
    this.registerChildComponent(childOne)
    this.registerChildComponent(childTwo)
    await this.startChildComponents()
  }
  async close(){
    await this.closeChildComponents();
  }
})();

const lifecycle = new Lifecycle(); 
lifecycle.register(parentComponent)
await lifecycle.start();
```