# Daily Focus — Recurring TODO Tracker

A clean, local-first daily TODO tracker built with React + TypeScript + Vite.

## Core features

- Daily task list
- Add, edit, delete and complete tasks
- Priority + category + estimated focus time
- Daily progress ring
- Streak tracking
- Monthly calendar
- 7-day activity strip
- Search and filters
- Carry-over support
- **Recurring tasks**
  - Every day
  - Weekdays
  - Weekly
  - Monthly
  - Custom days
  - Start date
  - Optional end date
  - Enable/disable
  - Edit/delete
- Recurring tasks automatically materialize into individual daily tasks.
- Each day's completion is independent.
- No backend required.
- LocalStorage persistence.
- GitHub Pages deployment workflow included.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages

Push to `main`, then enable **Settings → Pages → GitHub Actions**. The included workflow deploys the `dist` folder.

## Example routines

- DSA Practice → Every day → 60 min
- System Design → Every day → 60 min
- Gym → Mon/Wed/Fri → 60 min
- Weekly Review → Custom Sunday → 30 min

Recurring definitions are stored separately from daily task instances, so checking today's task complete does not complete tomorrow's task.
