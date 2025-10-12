import { EventEmitter } from 'node:events';
import type { EventMap } from './EventMap.ts';
import { type Status, statuses } from './Status.ts';
import { componentEvents } from './componentEvents.ts';
import type { LifecycleNode } from './makeLifecycleNode.ts';

type LifecycleRoot = {
  /**
   * Provide a callback for events emitted by lifecycle manager
   */
  on(event: keyof EventMap, cb: (name?: string) => unknown | void): void;
  /**
   * Register a callback for all events emitted by lifecycle manager -- useful for configuring logging, for example
   *
   * ```ts
   * lifecycle.all(console.log)
   * ```
   */
  all(cb: (event: keyof EventMap, name: string) => unknown): void;
  /**
   * Register a node with the lifecycle manager
   *
   * Components will be started in the order they are registered, and when the lifecycle begins closing they will be closed in the reverse order. This allows dependencies between lifecycle nodes to be managed and deterministic.
   *
   * For example, you could implement a database connection pool lifecycle nodes that creates a database connection pool when the lifecycle starts, and closes the pool when the lifecycle ends. By registering this node first, you guarantee its availability for all other lifecycle nodes, and guarantee that it won't be terminated unto all other nodes have closed.
   */
  register(component: LifecycleNode): void;
  /**
   * Start the lifecycle manager and all of its registered nodes.
   *
   * Once the lifecycle starts, you cannot register more nodes. Attempting to will throw an error
   */
  start(): Promise<void>;
  /**
   * Closed the lifecycle manager and all of its registered nodes. Lifecycle manager closes nodes in the reverse order they were registered
   */
  close(shouldExit?: boolean): Promise<void>;
  // [onRegistration]: () => void;
};

// const onRegistration = Symbol('lifecycle registration');

export const newLifecycleRoot = (): LifecycleRoot => {
  const emitter = new EventEmitter<EventMap>();
  let status: Status = 'pending';
  const components: LifecycleNode[] = [];
  const setStatus = (v: Status): void => {
    status = v;
    emitter.emit(v);
  };

  const root: LifecycleRoot = {
    on(event, cb) {
      emitter.on(event, cb);
    },
    all(cb) {
      [...statuses, ...componentEvents].forEach((event) =>
        emitter.on(event, (name: string) => cb(event, name))
      );
    },
    register(component) {
      if (status !== 'pending') {
        throw new Error('Cannot register components after lifecycle started');
      }
      components.push(component);
    },
    async start() {
      setStatus('starting');
      for (const component of components) {
        await component.start();
        emitter.emit('componentStarted', component.name);
      }
      setStatus('running');
    },
    async close(shouldExit) {
      switch (status) {
        case 'closing': {
          return new Promise((resolve) => root.on('closed', () => resolve()));
        }
        case 'running':
          break;
        default:
          throw new Error(`Tried to close lifecycle with status ${status}`);
      }
      Deno.removeSignalListener('SIGTERM', root.close);
      setStatus('closing');
      for (const component of components.toReversed()) {
        emitter.emit('componentClosing', component.name);
        await component.close();
        emitter.emit('componentClosed', component.name);
      }
      setStatus('closed');
      shouldExit && Deno.exit(0);
    },
  };
  return root;
};
