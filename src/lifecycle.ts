import { isDefined } from '@antman/bool';
import { delay } from '@std/async/delay';
import { EventEmitter } from 'node:events';

type ComponentStatus = 'pending' | 'running' | 'crashed';
/**
 * Define the options for the lifecycle manager
 */
export type LifecycleOptions = {
  /**
   * Define the frequency of component health check cycles. Note: This is the interval in which the lifecycle manager will begin polling each component's status -- the interval begins once each component has returned its status. Components returning their status in a promise can delay subsequent health checks.
   */
  healthCheckIntervalMs?: number;
};
const statuses = [
  'pending',
  'starting',
  'running',
  'closing',
  'closed',
] as const;
type Status = 'pending' | 'starting' | 'running' | 'closing' | 'closed';

/**
 * Define a lifecycle component to be managed by the lifecycle manager
 *
 * The status property is used for healthchecks; if the component status becomes 'crashed', the lifecycle manager will call `restart` if it exists, or `start` if it doesn't
 */
export abstract class LifecycleComponent {
  /**
   * Lifecycle manager will call `start` once per process lifetime. Each component's start method will be called in the sequence they were registered. Implement your component's
   */
  abstract start(): Promise<unknown>;
  /**
   * Lifecycle manager will call close once per process lifetime, in the reverse order the components are registered
   */
  abstract close(): Promise<unknown>;
  /**
   * Called by lifecycle manager to check the health of the component. Return true for healthy. If implemented, the lifecycle manager will call `start()` again if the component's health check returns false
   */
  abstract checkHealth?(): Promise<boolean>;
}

const defaultOptions = { healthCheckIntervalMs: 600 };
const componentEvents = [
  'componentStarted',
  'componentClosing',
  'componentClosed',
  'componentRestarting',
  'componentRestarted',
] as const;
type ComponentEvent = (typeof componentEvents)[number];
const isComponentEvent = (e: string | undefined): e is ComponentEvent =>
  componentEvents.includes(e as ComponentEvent);
type EventMap = Record<Status | 'healthChecked', []> & {
  componentStarted: [string];
  componentClosing: [string];
  componentClosed: [string];
  componentRestarting: [string];
  componentRestarted: [string];
};
/**
 * Manages the clean startup and shutdown of a process and its components.
 *
 * Register lifecycle components in the order they will be initialized, and then call `start()` on the lifecycle. When the lifecycle manager receives a SIGTERM or if the `close()` method is called, it will begin the shutdown process. The lifecycle manager closes each component in the reverse order of their registration
 */
export class Lifecycle {
  #emitter = new EventEmitter<EventMap>();
  #status: Status;
  #components: LifecycleComponent[];
  #healthCheckInterval: number;
  #healthCheckPromise: PromiseWithResolvers<void>;
  #setStatus(v: Status): void {
    this.#status = v;
    this.#emit(v);
  }
  #emit(event: keyof EventMap, name?: string): void {
    (isComponentEvent(event) && isDefined(name))
      ? this.#emitter.emit(event, name)
      : this.#emitter.emit(event);
  }
  /**
   * Provide a callback for events emitted by lifecycle manager
   */
  on(event: keyof EventMap, cb: (name?: string) => unknown | void): void {
    this.#emitter.on(event, cb);
  }
  /**
   * Register a callback for all events emitted by lifecycle manager -- useful for configuring logging, for example
   *
   * ```ts
   * lifecycle.all(console.log)
   * ```
   */
  all(cb: (event: keyof EventMap, name: string) => unknown): void {
    [...statuses, ...componentEvents].forEach((event) =>
      this.#emitter.on(event, (name: string) => cb(event, name))
    );
  }
  constructor(opt: LifecycleOptions = defaultOptions) {
    const { healthCheckIntervalMs } = { ...defaultOptions, ...opt };
    this.#status = 'pending';
    this.#components = [];
    this.#healthCheckInterval = healthCheckIntervalMs;
    this.#healthCheckPromise = Promise.withResolvers();
  }

  get status(): Status {
    return this.#status;
  }

  /**
   * Register a component with the lifecycle manager
   *
   * Components will be started in the order they are registered, and when the lifecycle begins closing they will be closed in the reverse order. This allows dependencies between lifecycle components to be managed and deterministic.
   *
   * For example, you could implement a database connection pool lifecycle component that creates a database connection pool when the lifecycle starts, and closes the pool when the lifecycle ends. By registering this component first  you can guarantee its availability for all other lifecycle components, and guarantee that it won't be terminated unto all other components have closed.
   */
  public register(component: LifecycleComponent): void {
    if (this.#status !== 'pending') {
      throw new Error('Cannot register components after lifecycle started');
    }
    this.#components.push(component);
  }
  /**
   * Start the lifecycle manager and all of its registered components.
   *
   * Once the lifecycle starts, you cannot register more components. Attempting to will throw an error
   */
  public start = async (): Promise<void> => {
    this.#setStatus('starting');
    for (const component of this.#components) {
      await this.#startComponent(component);
    }
    Deno.addSignalListener('SIGTERM', this.close);
    (async () => {
      do {
        await delay(this.#healthCheckInterval);
        await this.#checkComponentHealth();
      } while (this.status === 'running');
      this.#healthCheckPromise.resolve();
    })();
    this.#setStatus('running');
  };

  /**
   * Closed the lifecycle manager and all of its registered components. Lifecycle manager closes components in the reverse order they were registered
   */
  public close = async (shouldExit = true): Promise<void> => {
    if (this.#status === 'closing') {
      return new Promise((resolve) => this.on('closed', () => resolve()));
    }
    if (this.#status !== 'running') {
      throw new Error(`Tried to close lifecycle with status ${this.#status}`);
    }

    Deno.removeSignalListener('SIGTERM', this.close);
    this.#setStatus('closing');

    await this.#healthCheckPromise.promise;
    const components = this.#components.toReversed();

    for (const component of components) await this.#closeComponent(component);

    this.#setStatus('closed');
    shouldExit && Deno.exit(0);
  };
  async #startComponent(component: LifecycleComponent): Promise<void> {
    await component.start();
    this.#emit('componentStarted', component.constructor.name);
  }
  async #closeComponent(component: LifecycleComponent): Promise<void> {
    this.#emit('componentClosing', component.constructor.name);
    await component.close();
    this.#emit('componentClosed', component.constructor.name);
  }
  async #restartComponent(component: LifecycleComponent): Promise<void> {
    this.#emit('componentRestarting', component.constructor.name);
    await (component.start)();
    this.#emit('componentRestarted', component.constructor.name);
  }
  async #checkComponentHealth(): Promise<void> {
    for (const component of this.#components) {
      if ((await component.checkHealth?.() ?? true) === false) await this.#restartComponent(component);
    }
    this.#emit('healthChecked');
  }
}
