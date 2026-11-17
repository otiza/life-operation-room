# Reminders plan: say it once, get reminded

Written 17 November 2026, after the user tried Life Room for a real errand ("print some documents") and gave up: setting a deadline wasn't simple, and nothing reminded them. Their fallback is "my brain". This plan exists to beat that.

**Goal:** you type a task once, in plain English (in the app or in Telegram), and Life Room reminds you on your phone at the right time. You can mark it done or snooze it from the reminder, and ask the bot what is on today.

Order: PR 1 → 5. This plan comes **before** NOTES-PLAN and any further visual work.

## What's wrong today (measured, 17 Nov 2026)

Quick-add (`packages/shared/src/tasks/quick-add.ts`):

| Typed | Saved |
|---|---|
| `print documents tomorrow 5pm` | title "print documents **5pm**", when = tomorrow, no time, no due |
| `print documents tomorrow at 17:00` | title "print documents **at 17:00**", no due |
| `print documents at 5pm` | when = today, time dropped |
| `print documents in 2 hours` | when = today, time dropped |
| `print documents due tomorrow 5pm` | ✅ due = tomorrow 17:00 (only the hidden `due`/`by` keyword works) |

Also: chrono parses with the machine's timezone, not the `timeZone` option, so a time can shift if the server and the browser disagree.

Delivery: nothing. `NotificationsService` only handles workspace invites; `CalendarEventStartingEvent` is labelled "no delivery in this phase". No scheduler job, no push, no service worker, no Telegram.

## Decisions already made

| Decision | Choice |
|---|---|
| Channel | **Telegram bot** (free, no approval, works from the laptop). WhatsApp rejected: paid templates and a Meta Business setup. Browser notifications while a tab is open come as a bonus. |
| Language | English only for now. |
| Bot hosting | One bot per install. The user creates it with @BotFather; the token goes in `TELEGRAM_BOT_TOKEN`. The API **long-polls** `getUpdates`, so there's no public URL or webhook and it works behind the laptop's NAT. |
| A time means a reminder | If you type a time ("5pm", "at 17:00", "in 2 hours"), the task gets `dueAt` = that moment **and** a reminder at that moment. No special keyword. |
| A date without a time | The task goes on that day (`whenDate`, as today) and appears in that morning's digest. No separate ping. |
| `due` / `by` | Keeps working, with the same reminder rule. |
| Known limit | Reminders only fire while the laptop is on and the Docker stack is running. Missed reminders are sent late (marked "late") when the stack comes back, never silently dropped. Hosting comes later if this proves useful. |

## Data

- `tasks.remind_at timestamptz null`: when to ping. `tasks.reminded_at timestamptz null`: when the ping went out. Index on `remind_at` where `reminded_at is null and completed_at is null and deleted_at is null`.
- `users.timezone text not null default 'UTC'`: set from the browser on login/first visit. Needed for the digest and for server-side wording ("today 17:00").
- `users.reminder_prefs jsonb`: `{ digestTime: "08:00" | null, nudgeBefore: minutes | null }`.
- `telegram_links`: `user_id` (unique), `chat_id`, `linked_at`, plus a short-lived `link_code` / `link_code_expires_at` for the connect flow.
- A recurring task copies the reminder offset to the next occurrence (`insertNextOccurrence` in `tasks.service.ts`).

## PRs

### PR 1: capture that understands time
- Parser: `tomorrow 5pm`, `friday 9:30`, `at 17:00`, `in 2 hours`, `tonight at 8` → `whenDate` + `dueAt` + `remindAt`; the time words leave the title. Parse in the user's timezone (fix the chrono timezone bug).
- Quick-add dialog: date and time chips you can click to change or remove, plus a visible "🔔 17:00" chip, so nobody has to know the syntax.
- Edit form: one "Date · Time · Remind" row at the top. The reminder defaults to the time; "no reminder" is one click.
- Task rows: show time and a bell icon when a reminder is set.
- Migration: `remind_at`, `reminded_at`.

### PR 2: the reminder engine (in-app)
- `RemindersService`: `@Cron` every minute claims due rows (`update … set reminded_at = now() … returning`, so a row can't fire twice) and emits `task.reminder_due`.
- In-app delivery: a notification row + socket event, plus a browser `Notification` when permission is granted and a tab is open.
- `POST /tasks/:id/snooze { minutes }` and done via the existing status endpoint. Snoozing sets `remind_at` and clears `reminded_at`.
- Catch-up: on boot, anything overdue and unsent goes out once, labelled late.

### PR 3: Telegram
- `TelegramModule`: a small client over the Bot HTTP API (fetch, no SDK), long-poll loop, disabled cleanly when there's no token.
- Connect flow on a new personal **Reminders** page (next to Appearance): "Connect Telegram" → one-time code → `t.me/<bot>?start=<code>` → the bot replies "Connected ✅". Disconnect button.
- Reminder message: "⏰ Print documents, today 17:00", with inline buttons **Done**, **+1h**, **Tomorrow**. Taps arrive as `callback_query` through the same poll; the message edits itself to "✅ Done".
- Docker: pass `TELEGRAM_BOT_TOKEN` to `app-api`; README section "Set up the bot (2 min)".

### PR 4: talk to Life Room from Telegram
The user's idea (17 Nov): Telegram as a second interface to the app, not just a notifier.
- Same bot, same long-poll. Commands are accepted **only** from the linked `chat_id`; anything else gets "This bot is private."
- `/task <text>` (or any plain message) → parsed with the same `parseTaskQuickAdd` as the web dialog, in the user's timezone, into their default workspace. Reply: "✅ Print documents · tomorrow 17:00 🔔" with an **Undo** button.
- `/today`, `/upcoming`: numbered lists (today + overdue / next 7 days), each task with a ✅ button.
- `/done <n>`, `/snooze <n> <1h|tomorrow|…>`: `n` refers to the last list sent (kept per chat for 1 hour).
- `/help`. Bot command menu registered with `setMyCommands`.
- Commands call the existing task services directly, not over HTTP. Each command is a small handler, so more can follow (`/note`, `/event`).

### PR 5: morning digest and nudges
- Daily at `digestTime` in the user's timezone: "Today: 3 tasks (print documents 17:00, …), 1 overdue". Sent to Telegram, or in-app if not linked.
- Optional `nudgeBefore` (e.g. 1h before) as a second ping.
- Overdue nag: an unfinished task with a time gets one follow-up the next morning in the digest. No spam.
- Reminders page: digest time, nudge, a "Send test reminder" button.

## Done means
The user types `print documents tomorrow 5pm` on the laptop. At 17:00 the next day their phone buzzes with a Telegram message, they tap **Done**, and the task is completed in Life Room.

## Out of scope (for now)
WhatsApp, SMS, email, native mobile push / PWA (needs HTTPS hosting), French parsing, calendar-event reminders (easy to add on the same engine after PR 4), location reminders.
