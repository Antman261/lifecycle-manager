import { delay } from '@std/async/delay';
import { expect } from '@std/expect/expect';
import { setupEvents } from './testUtil.ts';
import { newNode } from './makeLifecycleNode.ts';
import { newLifecycleRoot } from './makeLifecycle.ts';

const stubAsync = () => delay(1);

Deno.test('Lifecycle maker functions', async () => {
  const [actual, actualEvent] = setupEvents();
  const lc = newLifecycleRoot();
  lc.register({ name: 'DatabasePool', start: stubAsync, close: stubAsync });

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
const parent = newNode((internals) => ({
  name: 'ParentComponent',
  async start() {
    events.push('parent.starting');
    internals.registerChildNode({
      name: 'childOne',
      async start() {
        events.push('childOne.starting');
        await delay(1);
        events.push('childOne.started');
        delay(1);
      },
      async close() {
        events.push('childOne.closing');
        await delay(1);
        events.push('childOne.closed');
      },
    });
    internals.registerChildNode({
      name: 'childTwo',
      async start() {
        events.push('childTwo.starting');
        await delay(1);
        events.push('childTwo.started');
        delay(1);
      },
      async close() {
        events.push('childTwo.closing');
        await delay(1);
        events.push('childTwo.closed');
      },
    });
    await internals.startChildNodes();
    events.push('parent.started');
  },
  async close() {
    events.push('parent.closing');
    await internals.closeChildNodes();
    events.push('parent.closed');
  },
}));

Deno.test('lifecycle node manages child nodes', async () => {
  events.splice(0, events.length);
  const lc = newLifecycleRoot();
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
