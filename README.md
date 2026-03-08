# School Board

A React dashboard for parents to track their child's weekly school updates — curriculum, at-home enrichment activities, upcoming events, and parent to-dos. Built to work with a teacher's weekly email + Google Doc curriculum.

![School Board screenshot](https://school-hub-lyart.vercel.app)

## Features

- **This Week** — Full weekly curriculum across 10 subjects (Character, Reading, Grammar, Vocabulary, Writing, Math, Science, History, Recitation, Spelling)
- **At Home** — Enrichment-only suggestions for Character, Reading, Writing, Science, History
- **To-Do** — Parent action items only (RSVPs, sign-ups, items to send) — not routine homework
- **Events** — List + calendar view with one-click Google Calendar add links
- Persistent storage via localStorage
- Installable as a PWA (home screen icon on mobile)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/phoebenomenon/school-hub
cd school-hub
npm install
```

### 2. Configure

```bash
cp src/config.example.js src/config.js
```

Edit `src/config.js` with your values:

```js
export const STUDENT_NAME = "Your Child's Name";
export const MY_EMAIL = "your-email@gmail.com";
export const PARTNER_EMAIL = "partner-email@gmail.com";  
export const TEACHER_EMAIL = "teacher@school.com";
export const GOOGLE_DOC_ID = "your-google-doc-id";      // from your teacher's curriculum doc URL
```

`src/config.js` is gitignored — your personal info never gets committed.

### 3. Update seed data

Edit `src/weekData.js` with your child's current week, or leave the placeholder data as-is and update it later.

### 4. Run

```bash
npm run dev
```

### 5. Configure Claude Code (optional)

If you use Claude Code to auto-update the dashboard from your teacher's weekly emails:

```bash
cp CLAUDE.example.md CLAUDE.md
```

Edit `CLAUDE.md` with your school context, then use the `/update-school-week` skill to auto-populate `src/weekData.js` from Gmail + Google Docs.

## Auto-Update Skill (Claude Code)

The `.claude/skills/update-school-week/SKILL.md` skill automates the weekly update:

1. Searches Gmail for the teacher's weekly email
2. Fetches the curriculum Google Doc
3. Parses all subjects and generates at-home tips
4. Overwrites `src/weekData.js` with the new week's data

Requires Claude Code with Gmail and browser MCP integrations. Customize the skill's subject parsing for your school's curriculum format.

## Deploy

Works with any static host. For Vercel:

```bash
npm install -g vercel
vercel --prod
```

## Stack

- React + Vite
- No Tailwind — all inline styles
- localStorage for persistence (no backend needed)
- Fonts: DM Sans + Fraunces via Google Fonts
