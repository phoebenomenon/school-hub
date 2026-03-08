---
name: update-school-week
description: Fetches the teacher's latest weekly email from Gmail, reads the curriculum Google Doc, parses all subjects, and overwrites src/weekData.js with the new week's data including at-home tips, events, and parent todos.
---

# Update Weekly Curriculum

You are updating the school dashboard with the latest weekly curriculum from the teacher.

Read `src/config.js` first to get: STUDENT_NAME, TEACHER_NAME, SCHOOL_NAME, GRADE, TEACHER_EMAIL, GOOGLE_DOC_ID, MY_EMAIL, PARTNER_EMAIL.

## Step 1: Get today's date
Run `date` to get the current date.

## Step 2: Find the teacher's latest weekly email
Search Gmail for: `from:TEACHER_EMAIL subject:Updates-Week`

Get the most recent email. Read the full thread to find:
- Week number (e.g., "Week 28")
- Date range (e.g., "March 9–13, 2026")
- Weekly affirmation (e.g., "I am brave")
- Google Doc link in the email body (the curriculum doc)
- Any events mentioned
- Any parent action items (things requiring a response or physical action)

Also search Gmail for any other recent emails from TEACHER_EMAIL in the past 2 weeks for additional events or requests.

## Step 3: Read the Google Doc
The curriculum Google Doc ID is in `src/config.js` as `GOOGLE_DOC_ID`.

Fetch it via the browser at:
`https://docs.google.com/document/d/[GOOGLE_DOC_ID]/export?format=txt`

Parse all 10 subjects from the doc:
- **Character**: topic + discussion question, testDay usually null
- **Reading**: book/unit name, subtitle if applicable, worksheet notes, testDay usually null
- **Grammar**: concepts covered, testDay usually Wednesday
- **Vocabulary**: word count, testDay (usually ~2 weeks out)
- **Writing**: current project/assignment, testDay usually null
- **Math**: 2-3 focus skills, testDay usually Thursday
- **Science**: unit/topic, subtitle if applicable, testDay usually null
- **History**: reader/unit name, testDay usually null
- **Recitation**: poem/passage + performance date, testDay = performance date
- **Spelling**: word count + test day, testDay usually Friday

## Step 4: Generate at-home tips
For these 5 subjects only, write an `atHome` field (2-4 sentences, warm parent tone, practical and specific to this week's content):
- **character** — conversation starters for family discussion
- **reading** — comprehension and fluency activities at home
- **writing** — ways to support the current writing project
- **science** — fun explorations tied to the current unit
- **history** — conversation starters and context

The other 5 subjects (grammar, vocabulary, math, recitation, spelling) also need `atHome` fields — write those using these patterns:
- **grammar**: game ideas for the specific concepts + test prep tip for the test day
- **vocabulary**: picture association technique + spread practice across the week
- **math**: quick games for each specific skill + mention test day
- **recitation**: week-by-week practice plan (memorize → expression → dress rehearsal)
- **spelling**: daily routine (Mon: read list, Tue: write + sentence, Wed: verbal quiz, Thu: written practice test)

Always reference the specific topics from this week (not generic advice). Use STUDENT_NAME when referencing the student.

## Step 5: Extract events
Create SEED_EVENTS from all events mentioned across the email and Google Doc.

Each event:
```js
{ id: "sN", title: "...", date: "YYYY-MM-DDTHH:MM:SSZ", type: "event|test|meeting|volunteer|break", source: "Week NN" }
```

For multi-day events add `endDate`. Use UTC times — school day events are at 9am Pacific (17:00 UTC), evening events convert accordingly.

Event types:
- `test` — grammar, spelling, math, vocabulary, recitation tests
- `event` — celebrations, dress-up days, school activities
- `meeting` — parent-teacher conferences, school meetings
- `volunteer` — volunteer opportunities, sales, fundraisers
- `break` — no school days, early release, spring break

## Step 6: Extract parent todos
Create SEED_TODOS for true parent action items only — things requiring a response or physical action.

**Include:**
- RSVP or opt-in/out requests
- Items to send to school
- Permission slips or sign-ups
- Volunteer commitments
- Any deadline-based requests

**Exclude:**
- Routine weekly tests (grammar Wed, spelling/math Thu — tracked via homework folder)
- FYI-only items (outfit reminders, affirmations)
- Read-only calendar items

Each todo:
```js
{ id: "tN", title: "...", details: "...", dueDate: "YYYY-MM-DDTHH:MM:SSZ", priority: "urgent|action", done: false, source: "TEACHER_NAME - Week NN (Mon Date)" }
```

Priority rules:
- `urgent` — needs response before or day-of the event, time-sensitive
- `action` — needs action this week but not immediately critical

## Step 7: Write the file
Overwrite `src/weekData.js` with the complete updated data.

Use this exact format:
```js
// This file is auto-updated weekly by the /update-school-week skill.
// Do not edit manually — run the skill after the teacher's Monday email arrives.

export const SEED_EVENTS = [
  // ... all events
];

export const SEED_TODOS = [
  // ... all todos
];

export const SEED_WEEK = {
  weekNumber: NN,
  weekOf: "Month D–D, YYYY",
  affirmation: "...",
  subjects: {
    character: {
      title: "...",
      topics: ["..."],
      testDay: null,
      atHome: "...",
    },
    reading: {
      title: "...",
      subtitle: "...",  // omit if none
      topics: ["..."],
      testDay: null,
      atHome: "...",
    },
    grammar: {
      title: "...",
      topics: ["..."],
      testDay: "Wednesday M/D",
      atHome: "...",
    },
    vocabulary: {
      title: "...",
      subtitle: "Test not until M/D",
      topics: ["..."],
      testDay: "M/D",
      atHome: "...",
    },
    writing: {
      title: "...",
      topics: ["..."],
      testDay: null,
      atHome: "...",
    },
    math: {
      title: "...",
      topics: ["..."],
      testDay: "Thursday M/D",
      atHome: "...",
    },
    science: {
      title: "...",
      subtitle: "...",  // omit if none
      topics: ["..."],
      testDay: null,
      atHome: "...",
    },
    history: {
      title: "...",
      subtitle: "...",  // omit if none
      topics: ["..."],
      testDay: null,
      atHome: "...",
    },
    recitation: {
      title: '"..."',
      subtitle: "by Author — Recitation M/D",
      topics: ["..."],
      testDay: "M/D",
      atHome: "...",
    },
    spelling: {
      title: "10 Spelling Words",
      topics: ["Practice all 10 spelling words", "Test this Friday M/D"],
      testDay: "Friday M/D",
      atHome: "...",
    },
  },
  source: "TEACHER_NAME - Week NN Updates (Mon Date) — Google Doc",
};
```

## Step 8: Verify and report
After writing the file, confirm:
- File was written successfully
- Week number and date range
- Number of events added
- Number of todos added
- Any subjects where you couldn't find data (flag these)

Report: "Week NN is loaded — X events, Y todos. The app will pick up the new data on next visit (or clear localStorage to force refresh)."

## Context
All personal details are in `src/config.js` (gitignored). Read that file at the start.
- Timezone: America/Los_Angeles
