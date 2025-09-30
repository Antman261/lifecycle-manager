import { isDefined } from '@antman/bool';
import { EventEmitter } from 'node:events';
import type { LifecycleComponent } from './LifecycleComponent.ts';

const statuses = [
  'pending',
  'starting',
  'running',
  'closing',
  'closed',
] as const;
type Status = (typeof statuses)[number];

const componentEvents = [
  'componentStarted',
  'componentClosing',
  'componentClosed',
] as const;
type ComponentEvent = (typeof componentEvents)[number];
const isComponentEvent = (e: string | undefined): e is ComponentEvent =>
  componentEvents.includes(e as ComponentEvent);
type EventMap = Record<Status, []> & {
  componentStarted: [string];
  componentClosing: [string];
  componentClosed: [string];
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
  constructor() {
    this.#status = 'pending';
    this.#components = [];
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
      await component.start();
      this.#emit('componentStarted', component.constructor.name);
    }
    Deno.addSignalListener('SIGTERM', this.close);
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

    const components = this.#components.toReversed();
    for (const component of components) {
      this.#emit('componentClosing', component.constructor.name);
      await component.close();
      this.#emit('componentClosed', component.constructor.name);
    }

    this.#setStatus('closed');
    shouldExit && Deno.exit(0);
  };
}
