# Daily review

End-of-day page at `/w/[workspaceId]/review`. Shell-level, not an installable app: it needs Tasks and uses Calendar and Notes when they are installed. No new table.

## Entry points

- Sidebar **Review day** (when Tasks is installed), the home header button, and **Review your day** in the command palette.
- From 17:00 local time the home shows **Time to wrap up the day** until the day is closed.
- After closing, the home header button reads **Day closed**.

## Steps

1. **What got done.** `GET /workspaces/:id/tasks?view=logbook&completedOn=YYYY-MM-DD&tz=…` lists tasks completed on that calendar day in the viewer timezone.
2. **Decide what is still open.** The Today list with Tomorrow, Not today, and Someday as buttons on each row (This evening stays in the menu), plus **Move all to tomorrow**. Same decision rules and undo as the home (`useTodayDecisions`): a deadline keeps a task on today.
3. **Reflect.** One paragraph prefixed `Day review: ` in today's daily note. Saving again replaces it; clearing removes it. Ctrl/⌘+Enter saves.
4. **Look at tomorrow.** Booked vs free time between 09:00 and 18:00 (events and task blocks, overlaps merged, all-day and due chips ignored), tasks planned for tomorrow, a load read-out, and a composer that creates a task with `when_date` = tomorrow.

Load read-out: empty (no tasks), heavy (less than 1 free hour, or more tasks than free hours), light (tasks ≤ a third of free hours), otherwise balanced.

## Close the day

Stored per viewer in browser storage (`life-room-review:<workspaceId>:<day>`). It only hides the evening nudge and changes the home button; it does not change any task. If storage is unavailable the review still works.

## Not in this version

Time estimates, automatic rollover, a configurable working window, and a weekly review.
