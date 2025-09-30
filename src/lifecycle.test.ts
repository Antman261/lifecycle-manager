import { delay } from '@std/async';
import { expect } from '@std/expect';
import { Lifecycle } from './lifecycle.ts';
import {
  createChecks,
  setupEvents,
  TestComponentOne,
  TestComponentThree,
  TestComponentTwo,
} from './testUtil.ts';

Deno.test('LifeCycle', async ({ step }) => {
  await step('can start & close a lifecycle', async () => {
    const { checks, passCheck } = createChecks();
    const lc = new Lifecycle();
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
    const lc = new Lifecycle();
    lc.register(new TestComponentOne());
    lc.register(new TestComponentTwo());
    lc.register(new TestComponentThree());

    lc.on(...actualEvent('componentStarted'));
    lc.on(...actualEvent('componentClosing'));
    lc.on(...actualEvent('componentClosed'));
    await lc.start();
    await lc.close(false);
    await delay(2);
    console.log(actual);
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
