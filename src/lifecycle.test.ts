import { delay } from 'jsr:@std/async';
import { expect } from 'jsr:@std/expect';
import { Lifecycle, type LifecycleComponent } from './lifecycle.ts';

const createChecks = () => {
  const checks = {
    didStart: false,
    didRun: false,
    didClosing: false,
    didClose: false,
  };
  const passCheck = (check: keyof typeof checks) => () => (checks[check] = true);
  return { checks, passCheck };
};

type EventName =
  | 'componentStarted'
  | 'componentRestarting'
  | 'componentRestarted'
  | 'componentClosing'
  | 'componentClosed';
type Event = `${EventName} ${string}`;
type Events = Event[];

type MakeEvent = (event: EventName) => Event;
const makeEventFn = (name?: string): MakeEvent => (event) => `${event} ${name}`;

const makeComponent = (c?: Partial<LifecycleComponent>): LifecycleComponent => {
  const name = c?.name ?? 'test-component';
  const component: LifecycleComponent = {
    name,
    start: async () => (await delay(1)) ?? (component.status = 'running'),
    status: 'pending',
    close: () => delay(1),
    ...c,
  };
  return component;
};

const makeCrashingComponent = (
  c?: Partial<LifecycleComponent>,
  crashAfterMs = 10,
): LifecycleComponent => {
  const component = makeComponent({
    start: async () => {
      (await delay(1)) ?? (component.status = 'running');
      delay(crashAfterMs).then(() => (component.status = 'crashed'));
    },
    restart: () => {
      component.status = 'running';
      return Promise.resolve();
    },
    ...c,
  });
  return component;
};

type EventTracker = (en: EventName) => [EventName, (cn?: string) => void];
const setupEvents = (): [Events, EventTracker] => {
  const actual: Events = [];
  const trackActual = (e: Event) => actual.push(e);
  return [
    actual,
    (en: EventName) => [en, (cn?: string) => trackActual(makeEventFn(cn)(en))],
  ];
};

Deno.test('LifeCycle', async ({ step }) => {
  await step('can start & close a lifecycle', async () => {
    const { checks, passCheck } = createChecks();
    const lc = new Lifecycle({ healthCheckIntervalMs: 50 });
    lc.on('starting', passCheck('didStart'));
    lc.on('running', passCheck('didRun'));
    lc.on('closing', passCheck('didClosing'));
    lc.on('closed', passCheck('didClose'));
    await lc.start();
    await lc.close(false);
    expect(checks).toEqual({
      didStart: true,
      didRun: true,
      didClosing: true,
      didClose: true,
    });
  });
  await step('start and close lifecycle components', async () => {
    const [actual, actualEvent] = setupEvents();
    const lc = new Lifecycle({ healthCheckIntervalMs: 50 });
    lc.register(makeComponent({ name: 'test-component-1' }));
    lc.register(makeComponent({ name: 'test-component-2' }));
    lc.register(makeComponent({ name: 'test-component-3' }));

    lc.on(...actualEvent('componentStarted'));
    lc.on(...actualEvent('componentClosing'));
    lc.on(...actualEvent('componentClosed'));
    await lc.start();
    await lc.close(false);
    await delay(2);
    expect(actual).toEqual([
      'componentStarted test-component-1',
      'componentStarted test-component-2',
      'componentStarted test-component-3',
      'componentClosing test-component-3',
      'componentClosed test-component-3',
      'componentClosing test-component-2',
      'componentClosed test-component-2',
      'componentClosing test-component-1',
      'componentClosed test-component-1',
    ]);
  });
  await step('restarts crashed life cycle component', async () => {
    const [actual, actualEvent] = setupEvents();
    const lc = new Lifecycle({ healthCheckIntervalMs: 1 });

    lc.register(makeComponent({ name: 'test-component-1' }));
    lc.register(makeComponent({ name: 'test-component-2' }));
    lc.register(makeCrashingComponent({ name: 'test-component-3' }, 4));
    lc.register(makeComponent({ name: 'test-component-4' }));
    lc.register(makeCrashingComponent({ name: 'test-component-5' }, 4));
    lc.on(...actualEvent('componentStarted'));
    lc.on(...actualEvent('componentClosing'));
    lc.on(...actualEvent('componentClosed'));
    lc.on(...actualEvent('componentRestarting'));
    lc.on(...actualEvent('componentRestarted'));
    await lc.start();
    await delay(15);
    await lc.close(false);
    await delay(30);
    expect(actual).toEqual([
      'componentStarted test-component-1',
      'componentStarted test-component-2',
      'componentStarted test-component-3',
      'componentStarted test-component-4',
      'componentStarted test-component-5',
      'componentRestarting test-component-3',
      'componentRestarted test-component-3',
      'componentRestarting test-component-5',
      'componentRestarted test-component-5',
      'componentClosing test-component-5',
      'componentClosed test-component-5',
      'componentClosing test-component-4',
      'componentClosed test-component-4',
      'componentClosing test-component-3',
      'componentClosed test-component-3',
      'componentClosing test-component-2',
      'componentClosed test-component-2',
      'componentClosing test-component-1',
      'componentClosed test-component-1',
    ]);
  });
});
