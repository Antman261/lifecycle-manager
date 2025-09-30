import { delay } from '@std/async/delay';
import { LifecycleComponent } from './LifecycleComponent.ts';

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
  | 'componentClosing'
  | 'componentClosed';
type Event = `${EventName} ${string}`;
type Events = Event[];
type MakeEvent = (event: EventName) => Event;
type EventTracker = (en: EventName) => [EventName, (cn?: string) => void];

export const makeEventFn = (name?: string): MakeEvent => (event) => `${event} ${name}`;

export class TestComponentOne extends LifecycleComponent {
  async start() {
    await delay(1);
  }
  async close() {
    await delay(1);
  }
}

export class TestComponentTwo extends LifecycleComponent {
  async start() {
    await delay(1);
  }
  async close() {
    await delay(1);
  }
}
export class TestComponentThree extends LifecycleComponent {
  async start() {
    await delay(1);
  }
  async close() {
    await delay(1);
  }
}
export class TestComponentFour extends LifecycleComponent {
  async start() {
    await delay(1);
  }
  async close() {
    await delay(1);
  }
}

export const setupEvents = (): [Events, EventTracker] => {
  const actual: Events = [];
  const trackActual = (e: Event) => actual.push(e);
  return [
    actual,
    (en: EventName) => [en, (cn?: string) => trackActual(makeEventFn(cn)(en))],
  ];
};
