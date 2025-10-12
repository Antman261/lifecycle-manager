import type { Status } from './Status.ts';

export type EventMap = Record<Status, []> & {
  componentStarted: [string];
  componentClosing: [string];
  componentClosed: [string];
};
