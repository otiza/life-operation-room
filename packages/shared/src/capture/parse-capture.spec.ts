import { describe, expect, it } from 'vitest';
import { parseCapture } from './parse-capture.js';

const REF = new Date('2026-11-09T10:00:00Z');

function capture(input: string, allowEvents = true) {
  return parseCapture(input, { referenceDate: REF, timeZone: 'UTC', allowEvents });
}

describe('parseCapture', () => {
  it('turns a clock time into an event', () => {
    const result = capture('Call Sam at 5');
    expect(result.kind).toBe('event');
    expect(result.event.title.toLowerCase()).toContain('call sam');
    expect(result.event.start).toBeTruthy();
    expect(result.event.isAllDay).toBe(false);
    expect(result.event.start!.getHours()).toBe(17);
  });

  it('keeps an explicit morning time in the morning', () => {
    const result = capture('Call Sam at 5am');
    expect(result.kind).toBe('event');
    expect(result.event.start!.getHours()).toBe(5);
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
