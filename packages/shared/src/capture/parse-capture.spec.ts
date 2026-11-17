import { describe, expect, it } from 'vitest';
import { parseCapture } from './parse-capture.js';

const REF = new Date('2026-11-09T10:00:00Z');

function capture(input: string, allowEvents = true) {
  return parseCapture(input, { referenceDate: REF, timeZone: 'UTC', allowEvents });
}

describe('parseCapture', () => {
  it('turns a lone clock time into a task with a reminder', () => {
    const result = capture('Call Sam at 5');
    expect(result.kind).toBe('task');
    expect(result.task.title).toBe('Call Sam');
    expect(result.task.dueAt).toBe('2026-11-09T17:00:00.000Z');
    expect(result.task.remindAt).toBe(result.task.dueAt);
  });

  it('keeps an explicit morning time in the morning', () => {
    const result = capture('Call Sam tomorrow at 5am');
    expect(result.kind).toBe('task');
    expect(result.task.dueAt).toBe('2026-11-10T05:00:00.000Z');
  });

  it('turns a time range into an event', () => {
    const result = capture('Dentist 5-6pm');
    expect(result.kind).toBe('event');
    expect(result.event.isAllDay).toBe(false);
  });

  it('turns a duration into an event', () => {
    const result = capture('Lunch with Sam at 1pm for 1h');
    expect(result.kind).toBe('event');
    expect(result.event.title.toLowerCase()).toContain('lunch');
  });

  it('lets event force an event from a lone time', () => {
    const result = capture('event Call Sam at 5');
    expect(result.kind).toBe('event');
    expect(result.event.start!.getHours()).toBe(17);
  });

  it('turns a date without a clock time into a task', () => {
    const result = capture('Pay rent tomorrow');
    expect(result.kind).toBe('task');
    expect(result.task.title).toBe('Pay rent');
    expect(result.task.whenDate).toBe('2026-11-10');
  });

  it('turns every Monday without a clock time into a repeating task', () => {
    const result = capture('Trash every Monday');
    expect(result.kind).toBe('task');
    expect(result.task.recurrenceRrule).toBe('FREQ=WEEKLY;BYDAY=MO');
    expect(result.task.title).toBe('Trash');
  });

  it('keeps a clock time with a task signal as a task', () => {
    const result = capture('File taxes due jan 12 5pm');
    expect(result.kind).toBe('task');
    expect(result.task.dueAt).toBeTruthy();
  });

  it('lets todo force a task even when a clock time is present', () => {
    const result = capture('todo Call Sam at 5');
    expect(result.kind).toBe('task');
    expect(result.task.title.toLowerCase()).toContain('call sam');
  });

  it('lets event force an event', () => {
    const result = capture('event Lunch tomorrow');
    expect(result.kind).toBe('event');
  });

  it('stays a task when events are not allowed', () => {
    const result = capture('Call Sam at 5', false);
    expect(result.kind).toBe('task');
  });
});
