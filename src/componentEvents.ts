export const componentEvents = [
  'componentStarted',
  'componentClosing',
  'componentClosed',
] as const;
export type ComponentEvent = (typeof componentEvents)[number];
export const isComponentEvent = (e: string | undefined): e is ComponentEvent =>
  componentEvents.includes(e as ComponentEvent);
