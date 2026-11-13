import { describe, expect, it } from 'vitest';
import { DEFAULT_TASK_SETTINGS } from '@life-room/shared';
import {
  addCalendarDays,
  bulkDecisionFeedback,
  decisionDisabled,
  decisionFeedback,
  decisionLeavesToday,
  decisionPatch,
  dueKeepsTaskOnToday,
  enabledDoneStatusKey,
  isCarriedOver,
} from './today-decisions';

const todayKey = '2026-11-10';
const startOfTomorrow = new Date('2026-11-11T00:00:00.000Z');

describe('today decisions', () => {
  it('adds calendar days across month boundaries', () => {
    expect(addCalendarDays('2026-11-10', 1)).toBe('2026-11-11');
    expect(addCalendarDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('treats an earlier when date as carried over', () => {
    expect(isCarriedOver('2026-11-09', todayKey)).toBe(true);
    expect(isCarriedOver(todayKey, todayKey)).toBe(false);
    expect(isCarriedOver(null, todayKey)).toBe(false);
  });

  it('keeps a task on today when the deadline is still today or overdue', () => {
    expect(dueKeepsTaskOnToday('2026-11-10T18:00:00.000Z', startOfTomorrow)).toBe(true);
    expect(dueKeepsTaskOnToday('2026-11-09T18:00:00.000Z', startOfTomorrow)).toBe(true);
    expect(dueKeepsTaskOnToday('2026-11-11T00:00:00.000Z', startOfTomorrow)).toBe(false);
    expect(dueKeepsTaskOnToday(null, startOfTomorrow)).toBe(false);
  });

  it('plans tomorrow without touching the deadline', () => {
    expect(decisionPatch('tomorrow', todayKey)).toEqual({
      whenDate: '2026-11-11',
      whenEvening: false,
      isSomeday: false,
    });
  });

  it('moves evening work onto today and clears someday', () => {
    expect(decisionPatch('evening', todayKey)).toEqual({
      whenDate: todayKey,
      whenEvening: true,
      isSomeday: false,
    });
  });

  it('releases a planned task without parking it in someday', () => {
    expect(decisionPatch('not_today', todayKey)).toEqual({
      whenDate: null,
      whenEvening: false,
      isSomeday: false,
    });
  });

  it('parks in someday by setting the flag alone so the server clears when', () => {
    expect(decisionPatch('someday', todayKey)).toEqual({ isSomeday: true });
  });

  it('leaves today unless the deadline still applies or the task moves to this evening', () => {
    const open = { dueAt: null };
    const dueToday = { dueAt: '2026-11-10T15:00:00.000Z' };
    expect(decisionLeavesToday('done', dueToday, startOfTomorrow)).toBe(true);
    expect(decisionLeavesToday('tomorrow', open, startOfTomorrow)).toBe(true);
    expect(decisionLeavesToday('tomorrow', dueToday, startOfTomorrow)).toBe(false);
    expect(decisionLeavesToday('not_today', dueToday, startOfTomorrow)).toBe(false);
    expect(decisionLeavesToday('someday', dueToday, startOfTomorrow)).toBe(false);
    expect(decisionLeavesToday('evening', open, startOfTomorrow)).toBe(false);
  });

  it('disables decisions that would not change the plan', () => {
    const evening = { whenDate: todayKey, whenEvening: true, isSomeday: false, dueAt: null };
    const unplanned = { whenDate: null, whenEvening: false, isSomeday: false, dueAt: '2026-11-10T15:00:00.000Z' };
    const parked = { whenDate: null, whenEvening: false, isSomeday: true, dueAt: null };
    expect(decisionDisabled('evening', evening, todayKey)).toBe(true);
    expect(decisionDisabled('not_today', unplanned, todayKey)).toBe(true);
    expect(decisionDisabled('someday', parked, todayKey)).toBe(true);
    expect(decisionDisabled('tomorrow', unplanned, todayKey)).toBe(false);
  });

  it('explains when a deadline keeps the task on today', () => {
    expect(decisionFeedback('tomorrow', true).description).toMatch(/due/);
    expect(decisionFeedback('tomorrow', false).description).toBeUndefined();
    expect(decisionFeedback('done', true)).toEqual({ title: 'Marked done' });
  });

  it('summarises a bulk decision', () => {
    expect(bulkDecisionFeedback('tomorrow', 2, 1)).toEqual({
      title: 'Moved 2 tasks to tomorrow',
      description: '1 stays on today because it is due.',
    });
    expect(bulkDecisionFeedback('someday', 1, 0)).toEqual({ title: 'Parked 1 task in Someday' });
    expect(bulkDecisionFeedback('not_today', 3, 3).description).toBe('3 stay on today because they are due.');
  });

  it('uses the first enabled done status', () => {
    expect(enabledDoneStatusKey(DEFAULT_TASK_SETTINGS)).toBe('done');
    expect(
      enabledDoneStatusKey({
        ...DEFAULT_TASK_SETTINGS,
        statuses: DEFAULT_TASK_SETTINGS.statuses.map((status) =>
          status.key === 'done' ? { ...status, enabled: false } : status,
        ),
      }),
    ).toBeNull();
  });
});
