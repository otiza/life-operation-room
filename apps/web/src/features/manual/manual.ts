export type ManualTable = {
  type: 'table';
  columns: [string, string];
  rows: Array<[string, string]>;
  /** Keys render as separate keycaps. Phrases stay as a single example. */
  variant?: 'keys' | 'examples';
};

export type ManualStep = { title: string; text: string };

export type ManualBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'steps'; items: ManualStep[] }
  | { type: 'callout'; title: string; text: string }
  | ManualTable;

export type ManualChapter = {
  slug: string;
  title: string;
  group: 'Guide' | 'Reference';
  summary: string;
  blocks: ManualBlock[];
};

export const MANUAL_CHAPTERS: ManualChapter[] = [
  {
    slug: 'start',
    title: 'Introduction',
    group: 'Guide',
    summary: 'Life Room is where you decide what belongs to today.',
    blocks: [
      {
        type: 'p',
        text: 'A sentence becomes a task or a calendar event. The workspace home then shows the day, with fixed events above the work you still have to accept or move. The rest of the product exists to keep that decision short.',
      },
      { type: 'h2', text: 'A day in the product' },
      {
        type: 'steps',
        items: [
          { title: 'Capture', text: 'Press q when you are not typing. One field accepts the sentence.' },
          { title: 'Organize', text: 'Leave it in Inbox, attach a project, or park it in Anytime or Someday.' },
          { title: 'Plan', text: 'On the home, read the events first, then keep, finish, or move each task.' },
          { title: 'Act', text: 'Mark the work done. A repeating task schedules its next occurrence.' },
          { title: 'Review', text: 'In the evening, open Review day: see what got done, decide what is still open, write a line, look at tomorrow, and close the day.' },
        ],
      },
      {
        type: 'callout',
        title: 'When is not the deadline',
        text: 'When is the day you intend to start. Due is the day the work must be finished. Moving a task off today changes when only. A task that is due today, or overdue, stays on Today.',
      },
    ],
  },
  {
    slug: 'capture',
    title: 'Capture',
    group: 'Guide',
    summary: 'One field creates a task or an event from the sentence.',
    blocks: [
      {
        type: 'p',
        text: 'Press q, or use + in the header, after Tasks is installed. Enter creates the item. Shift+Enter, or Cmd/Ctrl+Enter, creates it and leaves the field open.',
      },
      {
        type: 'p',
        text: 'A clock time creates an event when Calendar is installed. A date, a project, a deadline, or a repeat with no clock time creates a task. Begin the sentence with todo to force a task, or with event to force an event.',
      },
      { type: 'h2', text: 'Language' },
      {
        type: 'table',
        variant: 'examples',
        columns: ['Example', 'Result'],
        rows: [
          ['Call Sam at 5', 'Event at 5:00 pm. A bare hour from 1 to 7 is read as afternoon.'],
          ['Call Sam at 5am', 'Event at 5:00 am'],
          ['Standup at 9 every weekday', 'Repeating event'],
          ['Pay rent tomorrow', 'Task whose when date is tomorrow'],
          ['Call mom tonight', 'Task on today, in This evening'],
          ['Cook this evening', 'Same placement as tonight'],
          ['Ship docs today', 'When date is today'],
          ['Demo next fri', 'When date is the coming weekday'],
          ['Follow up in 3 days', 'When date is that many days ahead'],
          ['Tax forms jan 12', 'When date is 12 January'],
          ['Learn Mandarin someday', 'Someday. The when date is cleared.'],
          ['Submit report due fri', 'Deadline on Friday. The when date is unchanged.'],
          ['Invoice by friday', 'Same as due'],
          ['File taxes due jan 12 5pm', 'Deadline with a time. Still a task, because due is present.'],
          ['Clean garage #home', 'Assigned to that project. A unique prefix matches.'],
          ['Urgent bug !1', 'Priority, using your enabled order and skipping None'],
          ['Ship !urgent', 'Priority matched by its key'],
          ['Water plants every monday', 'Task that repeats every Monday'],
          ['Take meds every morning', 'Task that repeats every day'],
          ['Journal every evening', 'Repeats every day, in This evening'],
          ['Review every night', 'Same as every evening'],
          ['Walk every day', 'Repeats every day'],
          ['Check in every 2 days', 'Repeats on that interval'],
          ['Standup notes every weekday', 'Repeats Monday through Friday'],
          ['Review every week', 'Repeats weekly, starting today'],
          ['Plan every 2 weeks', 'Repeats every two weeks'],
          ['todo Call Sam at 5', 'Forced task, even though a time is present'],
          ['event Lunch tomorrow', 'Forced event'],
        ],
      },
      {
        type: 'callout',
        title: 'Unrecognized words stay in the title',
        text: 'An unknown #name shows a warning and remains in the title. A repeat the parser does not support, such as every blue moon, also stays in the title. The calendar page has a separate event field, opened with n. That field creates events only.',
      },
    ],
  },
  {
    slug: 'today',
    title: 'Planning the day',
    group: 'Guide',
    summary: 'The home is the decision, not a second calendar.',
    blocks: [
      {
        type: 'p',
        text: 'The workspace home lists today’s events, then today’s open tasks. The events bound the day before you decide which tasks remain.',
      },
      { type: 'h2', text: 'Decisions' },
      {
        type: 'table',
        columns: ['Action', 'Effect'],
        rows: [
          ['Mark done', 'Completes the task. A repeat schedules the next occurrence.'],
          ['Tomorrow', 'Moves when to tomorrow'],
          ['This evening', 'Keeps it on today, in the evening section'],
          ['Not today', 'Clears when. The task returns to Inbox, or to Anytime if it has a project.'],
          ['Someday', 'Parks the task and clears when'],
          ['Move carried over to tomorrow', 'Applies tomorrow to every open task whose when date is before today'],
        ],
      },
      {
        type: 'callout',
        title: 'A deadline holds the task on today',
        text: 'None of the planning actions clear a deadline. If the task is due today or overdue, it remains on Today, and a toast explains why.',
      },
      { type: 'h2', text: 'Reading the home' },
      {
        type: 'p',
        text: 'Past events are faded. The event happening now is highlighted, and the next one says how long until it starts. Beside Tasks, a bar shows how much of today is done. Evening tasks sit in their own section.',
      },
      { type: 'h2', text: 'Review the day' },
      {
        type: 'p',
        text: 'Open Review day from the Day section of the sidebar, from Today, or from the command palette. From 17:00 the home also offers it until you close the day.',
      },
      {
        type: 'table',
        columns: ['Step', 'What happens'],
        rows: [
          ['What got done', 'Tasks you completed today, with the time'],
          ['Decide what is still open', 'Tomorrow, Not today, or Someday on each row, or move all to tomorrow. Anything you skip stays on today.'],
          ['Reflect', 'A line or two saved to today’s note. Ctrl or Cmd + Enter saves.'],
          ['Look at tomorrow', 'Free and booked time between 9:00 and 18:00, the tasks already planned, and whether the day looks light, balanced, or heavy. Add tasks for tomorrow here.'],
          ['Close the day', 'Hides the evening reminder and marks the home Day closed. It does not change any task.'],
        ],
      },
      {
        type: 'callout',
        title: 'Heavy means more tasks than free hours',
        text: 'There are no time estimates. The review compares the number of tasks with the free hours your calendar leaves, so treat it as a hint, not a schedule.',
      },
    ],
  },
  {
    slug: 'tasks',
    title: 'Tasks',
    group: 'Reference',
    summary: 'Smart views, projects, and the actions on a single task.',
    blocks: [
      {
        type: 'p',
        text: 'Tasks opens on Today. Smart views come first, then projects. Inbox is not a project. It is the set of open tasks with no project, no when date, and no Someday flag.',
      },
      { type: 'h2', text: 'Views' },
      {
        type: 'table',
        columns: ['View', 'Contains'],
        rows: [
          ['Inbox', 'Open tasks with no project, no when date, and not Someday'],
          ['Today', 'Open tasks whose when date is today or earlier, or whose deadline is today or overdue'],
          ['Upcoming', 'Open tasks whose when date or deadline is after today'],
          ['Anytime', 'Open tasks in a project, with no when date, and not Someday'],
          ['Someday', 'Open tasks parked without a when date'],
          ['Logbook', 'Completed tasks, newest first'],
        ],
      },
      {
        type: 'p',
        text: 'This evening is a section inside Today, not a time of day. A when date in the past rolls onto Today automatically. List and board are two layouts of the same tasks. j and k move the selection, and the side panel follows.',
      },
      { type: 'h2', text: 'Editing' },
      {
        type: 'p',
        text: 'The circle, or x, completes a task. Undo is offered in the toast. e edits the title in the side panel. w sets when, d sets the deadline, s sets status, p sets priority, m moves the task to a project, and a assigns it. Backspace deletes the task and can restore the same record.',
      },
      {
        type: 'p',
        text: 'On the row, when is shown with a date and the deadline is shown with a flag, so the two dates stay distinct.',
      },
    ],
  },
  {
    slug: 'repeat',
    title: 'Repeating work',
    group: 'Reference',
    summary: 'How a completed repeat schedules the next occurrence.',
    blocks: [
      {
        type: 'p',
        text: 'A repeat written without a clock time creates a task: every monday, every morning, every evening, every day, every weekday, every week, and intervals such as every 2 days or every 2 weeks. The same words with a clock time create a repeating event, as in Standup at 9 every weekday.',
      },
      {
        type: 'p',
        text: 'The rule is shown under the task title. Completing the task inserts the next open copy with the same title, project, priority, and rule. The deadline is not copied. Cancelling does not schedule a successor. Stop repeating, in the task panel, clears the rule.',
      },
      { type: 'h2', text: 'Which day comes next' },
      {
        type: 'table',
        columns: ['When you finish it', 'Next occurrence'],
        rows: [
          ['On the planned day', 'The following slot after that day'],
          ['Before the planned day', 'The slot after the planned day'],
          ['After the planned day', 'The next slot after today'],
        ],
      },
    ],
  },
  {
    slug: 'calendar',
    title: 'Calendar',
    group: 'Reference',
    summary: 'Events, time blocks, and the relationship to tasks.',
    blocks: [
      {
        type: 'p',
        text: 'The calendar has day, week, month, and agenda. Click an empty time, or drag downward, to create an event. Drag an event to move it, and drag its edge to change the duration. All-day events sit above the hours.',
      },
      {
        type: 'p',
        text: 'The side list holds open tasks that have no time block. Drag one onto a time to schedule it. The home lists events for context and does not repeat this grid.',
      },
      {
        type: 'p',
        text: 'The field on the calendar page, opened with n, parses events only, including repeats and a location after at. A repeating event can be changed for one occurrence or for the series. An ICS feed is available in calendar settings.',
      },
    ],
  },
  {
    slug: 'notes',
    title: 'Notes',
    group: 'Reference',
    summary: 'One page for the day, with paragraphs and checkboxes.',
    blocks: [
      {
        type: 'p',
        text: 'Notes keeps one page per calendar day in your timezone. The workspace home opens today’s note with a single control. The home still lists events, then tasks; the note is not a third list.',
      },
      {
        type: 'p',
        text: 'The page looks like writing. You see paragraphs and real checkboxes. There is no Save button; edits autosave. Type a line that starts with a checkbox marker, or press Enter after - [ ], to add a checklist line.',
      },
      {
        type: 'p',
        text: 'Checking an open line, or Make task on a focused open line, creates a task for that day when Tasks is installed. The line stays in the note and points at the task, so using the action again does not make a second copy. Without Tasks, the checkbox stays part of the note only.',
      },
    ],
  },
  {
    slug: 'shortcuts',
    title: 'Shortcuts',
    group: 'Reference',
    summary: 'Keys available when focus is not in a text field.',
    blocks: [
      {
        type: 'p',
        text: 'Shortcuts are ignored while you are typing. ? opens the short list from any screen. This manual is the full reference. Cmd/Ctrl+K opens the command palette for installed apps.',
      },
      { type: 'h2', text: 'Anywhere' },
      {
        type: 'table',
        variant: 'keys',
        columns: ['Key', 'Action'],
        rows: [
          ['q', 'Open capture'],
          ['?', 'Open the shortcut list'],
          ['Cmd/Ctrl+K', 'Open the command palette'],
        ],
      },
      { type: 'h2', text: 'Tasks' },
      {
        type: 'table',
        variant: 'keys',
        columns: ['Key', 'Action'],
        rows: [
          ['j / k', 'Move the selection'],
          ['x', 'Complete or reopen'],
          ['e', 'Edit the title'],
          ['s', 'Set status'],
          ['p', 'Set priority'],
          ['w', 'Set when'],
          ['d', 'Set the deadline'],
          ['m', 'Move to a project'],
          ['a', 'Assign'],
          ['Backspace', 'Delete, with undo'],
          ['/', 'Focus search'],
        ],
      },
      { type: 'h2', text: 'Calendar' },
      {
        type: 'table',
        variant: 'keys',
        columns: ['Key', 'Action'],
        rows: [
          ['n', 'Focus the event field'],
          ['t', 'Jump to today'],
          ['d', 'Day'],
          ['w', 'Week'],
          ['m', 'Month'],
          ['a', 'Agenda'],
        ],
      },
    ],
  },
  {
    slug: 'workspace',
    title: 'Workspace',
    group: 'Reference',
    summary: 'Membership, installed apps, and what is not available yet.',
    blocks: [
      {
        type: 'p',
        text: 'Signup creates a personal workspace. It cannot be shared. A shared workspace accepts email invites. Guests can read. Members can change work. Owners and admins install and remove apps.',
      },
      {
        type: 'p',
        text: 'Apps are added per workspace: open the profile menu at the bottom of the sidebar and choose Add apps. Tasks requires Projects. Calendar and Notes have no dependency. Costs, chat, learning, work finder, goals, and fitness are listed as coming soon and do not open.',
      },
      {
        type: 'p',
        text: 'The bell in the header lists notifications. The profile menu at the bottom of the sidebar holds Settings, this Manual, Add apps, the theme (light, dark, or system), and Log out.',
      },
    ],
  },
];

export function getManualChapter(slug: string) {
  return MANUAL_CHAPTERS.find((chapter) => chapter.slug === slug);
}

export function manualHeadingId(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
