/**
 * Define a lifecycle component to be managed by the lifecycle manager
 */
export abstract class LifecycleComponent {
  #components: LifecycleComponent[] = [];
  /**
   * Lifecycle manager will call `start` once per process lifetime. Each component's start method will be called in the sequence they were registered.
   */
  abstract start(): Promise<unknown>;
  /**
   * Lifecycle manager will call close once per process lifetime, in the reverse order the components are registered
   */
  abstract close(): Promise<unknown>;
  /**
   * Register a child component of a lifecycle component to guarantee that its children are started in the order they are registered, and closed in the reverse order. The implementer of the lifecycle component is responsible for calling startChildComponents and closeChildComponents during start and close, respectively.
   */
  registerChildComponent(component: LifecycleComponent): void {
    this.#components.push(component);
  }
  /**
   * Start the registered children of the lifecycle component
   */
  async startChildComponents(): Promise<void> {
    for (const component of this.#components) await component.start();
  }
  /**
   * Close the registered children of the lifecycle component in the reverse of their registration order
   */
  async closeChildComponents(): Promise<void> {
    for (const component of this.#components.toReversed()) await component.close();
  }
  /**
   * Return the registered components of the lifecycle
   */
  getChildren(): Readonly<LifecycleComponent[]> {
    return [...this.#components];
  }
}
