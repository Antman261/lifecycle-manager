import { delay } from '@std/async/delay';
import { Lifecycle } from './lifecycle.ts';
import { LifecycleComponent } from './LifecycleComponent.ts';
import { expect } from '@std/expect/expect';
import { setupEvents } from './testUtil.ts';

class DatabasePool extends LifecycleComponent {
  constructor() {
    super();
  }
  start() {
    return delay(1);
  }
  close() {
    return delay(1);
  }
}

Deno.test('Lifecycle component as a class', async () => {
  const db = new DatabasePool();
  const [actual, actualEvent] = setupEvents();
  const lc = new Lifecycle();
  lc.register(db);

  lc.on(...actualEvent('componentStarted'));
  lc.on(...actualEvent('componentClosing'));
  lc.on(...actualEvent('componentClosed'));
  await lc.start();
  await lc.close(false);
  await delay(2);
  expect(actual).toEqual([
    'componentStarted DatabasePool',
    'componentClosing DatabasePool',
    'componentClosed DatabasePool',
  ]);
});

const events: string[] = [];
const parent = new (class ParentComponent extends LifecycleComponent {
  async start() {
    events.push('parent.starting');
    this.registerChildComponent(childOne);
    this.registerChildComponent(childTwo);
    await this.startChildComponents();
    events.push('parent.started');
  }
  async close() {
    events.push('parent.closing');
    await this.closeChildComponents();
    events.push('parent.closed');
  }
})();
const childOne = new (class extends LifecycleComponent {
  async start() {
    events.push('childOne.starting');
    await delay(1);
    events.push('childOne.started');
    delay(1);
  }
  async close() {
    events.push('childOne.closing');
    await delay(1);
    events.push('childOne.closed');
  }
})();
const childTwo = new (class extends LifecycleComponent {
  async start() {
    events.push('childTwo.starting');
    await delay(1);
    events.push('childTwo.started');
    delay(1);
  }
  async close() {
    events.push('childTwo.closing');
    await delay(1);
    events.push('childTwo.closed');
  }
})();

Deno.test('lifecycle component manages child lifecycle components', async () => {
  events.splice(0, events.length);
  const lc = new Lifecycle();
  lc.on('componentStarted', (name) => events.push(`componentStarted ${name}`));
  lc.on('componentClosed', (name) => events.push(`componentClosed ${name}`));
  lc.register(parent);
  await lc.start();
  await lc.close(false);
  await delay(2);
  expect(events).toEqual([
    'parent.starting',
    'childOne.starting',
    'childOne.started',
    'childTwo.starting',
    'childTwo.started',
    'parent.started',
    'componentStarted ParentComponent',
    'parent.closing',
    'childTwo.closing',
    'childTwo.closed',
    'childOne.closing',
    'childOne.closed',
    'parent.closed',
    'componentClosed ParentComponent',
  ]);
});
