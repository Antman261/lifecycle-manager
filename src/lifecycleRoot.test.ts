import { delay } from '@std/async';
import { expect } from '@std/expect';
import { createChecks, setupEvents } from './testUtil.ts';
import { newLifecycleRoot } from './makeLifecycle.ts';

const stubAsync = () => delay(1);
const makeTestNode = (name: string) => ({ name, start: stubAsync, close: stubAsync });

Deno.test('LifecycleRoot', async ({ step }) => {
  await step('can start & close a lifecycle', async () => {
    const { checks, passCheck } = createChecks();
    const lc = newLifecycleRoot();
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
    const lc = newLifecycleRoot();
    lc.register(makeTestNode('TestComponentOne'));
    lc.register(makeTestNode('TestComponentTwo'));
    lc.register(makeTestNode('TestComponentThree'));

    lc.on(...actualEvent('componentStarted'));
    lc.on(...actualEvent('componentClosing'));
    lc.on(...actualEvent('componentClosed'));
    await lc.start();
    await lc.close(false);
    await delay(2);
    expect(actual).toEqual([
      'componentStarted TestComponentOne',
      'componentStarted TestComponentTwo',
      'componentStarted TestComponentThree',
      'componentClosing TestComponentThree',
      'componentClosed TestComponentThree',
      'componentClosing TestComponentTwo',
      'componentClosed TestComponentTwo',
      'componentClosing TestComponentOne',
      'componentClosed TestComponentOne',
    ]);
  });
});
