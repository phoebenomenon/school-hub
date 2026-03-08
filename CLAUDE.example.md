# School Board — Project Context for Claude Code

## What This Is

A React dashboard for tracking your child's weekly school updates. Built as a single-page app with persistent localStorage.

## Setup

1. Copy `src/config.example.js` to `src/config.js` and fill in your values
2. Copy this file to `CLAUDE.md` and update with your child's context

## Your Child's Context

- **Student**: [name], [grade] at [school name]
- **Teacher**: [teacher name] ([email])
- **Family location**: [city/region]

## Teacher Email Pattern

- Weekly updates sent every Monday with subject: `[your subject pattern here]`
- Google Doc link in email body (same doc updated weekly)
- Google Doc ID stored in `src/config.js`

## Tech Stack

- React + Vite, no Tailwind — all inline styles
- localStorage for persistence
- Storage keys: `[student]-events-v6`, `[student]-todos-v6`, `[student]-week-v6`
  - Update these in `src/Dashboard.jsx` if you rename the component

## Auto-Update Skill

The `/update-school-week` skill (`.claude/skills/update-school-week/SKILL.md`) automates fetching the weekly email and updating `src/weekData.js`. Customize it for your teacher's email format and doc structure.

## Subjects

Default subjects match a typical elementary curriculum:
Character, Reading, Grammar, Vocabulary, Writing, Math, Science, History, Recitation, Spelling

Modify the subject structure in `src/weekData.js` and the skill if yours differs.
