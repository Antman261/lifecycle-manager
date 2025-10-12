type LifecycleNodeInternals<T extends LifecycleNode = LifecycleNode> = {
  /**
   * Start the registered children of the lifecycle node
   */
  startChildNodes(): Promise<void>;
  /**
   * Close the registered children of the lifecycle node in the reverse of their registration order
   */
  closeChildNodes(): Promise<void>;
  /**
   * Register a child node of a lifecycle node to guarantee that its children are started in the order they are registered, and closed in the reverse order. The implementer of the lifecycle node is responsible for calling startChildNodes and closeChildNodes during start and close, respectively.
   */
  registerChildNode(node: LifecycleNode): void;

  /**
   * Return the registered nodes of the lifecycle node
   */
  getChildren(): Readonly<T[]>;
};

export type LifecycleNode = {
  name: string;
  /**
   * Lifecycle manager will call `start` once per process lifetime. Each nodes's start method will be called in the sequence they were registered.
   */
  start(): Promise<unknown>;
  /**
   * Lifecycle manager will call close once per process lifetime, in the reverse order the nodes are registered
   */
  close(): Promise<unknown>;
};

type MakerFunc = <T extends LifecycleNode = LifecycleNode>(
  internals: LifecycleNodeInternals<T>,
) => LifecycleNode;

/**
 * Use extendLifecycleNode when you need a lifecycle node to manage its own lifecycle children. This allows you to decompose a sequence of nodes into groups of nodes managing other smaller nodes in complex applications. This approach effectively turns your application lifecycle into a directed acyclic graph where every node has a single parent, AKA a tree.
 *
 * By omitting `await` when calling `startChildNodes` or `closeChildNodes` you can allow branches of the tree to start up or shut down concurrently.
 *
 * You must call `startChildNodes` in the `start` function you provide a node, and similarly must call `closeChildNodes` in `close`.
 *
 * @example
 * ```
 * const lifecycle = makeLifecycle();
 * lifecycle.register((internals) => {
 *  return {
 *    name: 'FooBar',
 *    async start() {
 *      await doSomePrep();
 *      // uses un-awaited immediately invoked async function expression
 *      // to start child nodes concurrently with sibling nodes
 *      (async () => {
 *        await internals.startChildNodes();
 *        await doAfterChildrenStarted();
 *      })();
 *    }
 *    async close() {
 *      // awaits closeChildNodes to ensure that child nodes are closed before siblings begin closing, as an example. Typically a node's start and close methods either both await child nodes or both leave them un-awaited
 *      await closeChildNodes();
 *    }
 *  }
 * })
 * ```
 */
export const newNode = (
  maker: MakerFunc,
): LifecycleNode => {
  const nodes: LifecycleNode[] = [];
  const internals: LifecycleNodeInternals = {
    registerChildNode(node) {
      nodes.push(node);
    },
    async startChildNodes() {
      for (const node of nodes) await node.start();
    },
    async closeChildNodes() {
      for (const node of nodes.toReversed()) await node.close();
    },
    getChildren: () => [...nodes],
  };
  return maker(internals);
};
