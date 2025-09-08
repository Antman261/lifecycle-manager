import { delay } from '@std/async/delay';
import { Lifecycle, LifecycleComponent } from './lifecycle.ts';
import { expect } from 'jsr:@std/expect/expect';
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
  checkHealth: undefined;
}

Deno.test('Lifecycle component as a class', async () => {
  const db = new DatabasePool();
  const [actual, actualEvent] = setupEvents();
  const lc = new Lifecycle({ healthCheckIntervalMs: 50 });
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
