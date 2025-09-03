import { delay } from '@std/async/delay';
import type { LifecycleComponent } from './lifecycle.ts';

export const createChecks = () => {
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
type EventTracker = (en: EventName) => [EventName, (cn?: string) => void];

export const makeEventFn = (name?: string): MakeEvent => (event) => `${event} ${name}`;

export const makeComponent = (c?: Partial<LifecycleComponent>): LifecycleComponent => {
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

export const makeCrashingComponent = (
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

export const setupEvents = (): [Events, EventTracker] => {
  const actual: Events = [];
  const trackActual = (e: Event) => actual.push(e);
  return [
    actual,
    (en: EventName) => [en, (cn?: string) => trackActual(makeEventFn(cn)(en))],
  ];
};
