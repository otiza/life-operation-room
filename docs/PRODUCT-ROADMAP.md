# Product roadmap

Research date: **10 November 2026**. Evidence and source links are in [COMPETITIVE-BENCHMARK.md](./COMPETITIVE-BENCHMARK.md). Scores below are recommendations, not measurements.

Core promise: Life room is the best place to decide what matters today, whether it started as a task, a note, an event, a project, or a message.

Daily loop: capture → organize → plan → act → review.

## How ideas were scored

`user value × frequency × integration × differentiation ÷ implementation cost`

Each factor is 1 (low) to 5 (high). Cost is the divisor, so a 5 is the most expensive. Integration means Tasks, Projects, Calendar, Today, and a future Notes app. Differentiation means a clearer daily decision than the reference products, using when vs due rather than a copy of their ritual.

| Idea | Value | Frequency | Integration | Differentiation | Cost | Score | Decision |
|---|---:|---:|---:|---:|---:|---:|---|
| Decide what stays on today | 5 | 5 | 5 | 4 | 2 | 250 | **Build now** |
| Guided plan-my-day (estimates, auto time blocks, shutdown script) | 5 | 4 | 5 | 3 | 5 | 60 | Defer |
| Notes, with a daily note on the home | 4 | 5 | 5 | 3 | 5 | 60 | Started |
| Message triage (chat → inbox → accept) | 4 | 3 | 4 | 4 | 5 | 38 | Defer |
| Recurring tasks | 4 | 4 | 3 | 2 | 4 | 24 | Built |
| Inbox triage (accept, snooze, decline) | 3 | 3 | 4 | 3 | 3 | 36 | Later |
| Focus timer | 3 | 4 | 2 | 2 | 3 | 16 | Defer |
| Subtasks | 3 | 3 | 3 | 2 | 3 | 18 | Defer |

## What shipped from this pass

**Decide what stays on today**, on the workspace home.

Why it won:

- Value: the promise is the decision, and the home was only a readout.
- Frequency: every day the Today view is opened. Past when dates already roll in, so the list grows until someone moves them.
- Integration: it uses the Today query, task update, done status, and the calendar list already on the home. Projects are unchanged because clearing when returns a task to Inbox or Anytime by the existing rules. A future note can join the same list later without a new gesture.
- Differentiation: Things, Todoist, and Sunsama all reschedule. Life room keeps the deadline. Moving a task to tomorrow, this evening, off today, or Someday changes when only. If it is still due, it stays on today and the toast says so.
- Cost: no new table, no new app, no calendar grid on the home. Calendar time blocking already exists on the calendar route, so this pass does not rebuild it.

The loop it strengthens:

- Capture stays the home composer and `q`.
- Organize stays Inbox, projects, Anytime, and Someday.
- Plan and review are the new row decisions and **Move carried over to tomorrow**.
- Act is **Mark done** on the same row.

Calendar occurrences are listed above tasks so fixed time is visible before those decisions. That order follows Things (events, then to-dos) and Sunsama (plan around the day). It is not a second calendar.

## Explicitly deferred

1. **Guided plan-my-day.** Time estimates, a step-by-step shutdown, automatic rollover settings, and dragging tasks onto hours from the home. Use the calendar's time blocks until that ritual is designed on its own.
2. **Notes beyond the daily page.** Folders, search, files, capture into a note, and richer Markdown stay out. The first daily note page and checklist → task path are started; see [apps/NOTES.md](./apps/NOTES.md).
3. **Message triage.** Linear's path from Slack into Triage is the right collaboration pattern. Life room has no chat app yet. Accepted messages should land in Inbox, not on Today.

Also still out of scope: labels, saved views, subtasks, comments, mentions, and an activity log. Recurring tasks and one capture field for a task or an event are in. Completing a repeating task schedules the next one. A clock time in the capture field creates a calendar event when Calendar is installed.
