// Project-level constants. Source of truth for "200 days" narrative.
// PROJECT_END is computed from start + planned days, so adjusting the
// planned duration here will ripple through the timeline visualization.

export const PROJECT_START = '2026-04-22';
export const PROJECT_PLANNED_DAYS = 200;

const computeEndDate = (start: string, days: number): string => {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const PROJECT_END = computeEndDate(PROJECT_START, PROJECT_PLANNED_DAYS);
