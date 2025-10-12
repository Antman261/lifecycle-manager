export type Status = (typeof statuses)[number];
export const statuses = [
  'pending',
  'starting',
  'running',
  'closing',
  'closed',
] as const;
