import { delay } from '@std/async/delay';
import { LifecycleComponent } from './lifecycle.ts';

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

export class TestComponentOne extends LifecycleComponent {
  async start() {
    await delay(1);
  }
  async close() {
    await delay(1);
  }
  checkHealth: undefined;
}

export class TestComponentTwo extends LifecycleComponent {
  async start() {
    await delay(1);
  }
  async close() {
    await delay(1);
  }
  checkHealth: undefined;
}
export class TestComponentThree extends LifecycleComponent {
  async start() {
    await delay(1);
  }
  async close() {
    await delay(1);
  }
  checkHealth: undefined;
}
export class TestComponentFour extends LifecycleComponent {
  async start() {
    await delay(1);
  }
  async close() {
    await delay(1);
  }
  checkHealth: undefined;
}
export class CrashingTestComponentOne extends LifecycleComponent {
  crashAfterMs: number;
  hasCrashed = false;
  constructor(crashAfterMs = 10) {
    super();
    this.crashAfterMs = crashAfterMs;
  }
  async start() {
    this.hasCrashed = false;
    await delay(1);
    delay(this.crashAfterMs).then(() => (this.hasCrashed = true));
  }
  async close() {
    await delay(1);
  }
  checkHealth() {
    return Promise.resolve(!this.hasCrashed);
  }
}
export class CrashingTestComponentTwo extends LifecycleComponent {
  crashAfterMs: number;
  hasCrashed = false;
  constructor(crashAfterMs = 10) {
    super();
    this.crashAfterMs = crashAfterMs;
  }
  async start() {
    this.hasCrashed = false;
    await delay(1);
    delay(this.crashAfterMs).then(() => (this.hasCrashed = true));
  }
  async close() {
    await delay(1);
  }
  checkHealth() {
    return Promise.resolve(!this.hasCrashed);
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
