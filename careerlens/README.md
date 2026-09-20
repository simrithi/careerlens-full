# CareerLens POC (UI demo)

Interactive front-end demo of the CareerLens idea for the AWS Build & Ship hackathon.
**Everything is dummy data.** No backend, no real APIs. The structure is built so a team can swap in real services one function at a time.

## Run it

```
npm install
npm run dev
```
Open http://localhost:5173 (Windows: double-click `start-demo.bat`).

## Demo accounts (password `demo123`)

| Account | Type | Story |
|---|---|---|
| ananya@demo.in | Fresher | Tier-2 student, Android at Google in 8 months, on track |
| vikram@demo.in | Experienced | Laid off, pivoting to Cloud/DevOps, behind schedule |
| hr@novapixel.demo | Company | Game-studio recruiter, blind screening, project matching |

Use the **Demo guide** button (bottom-left) for a suggested walkthrough per account.
"Reset demo data" in the user menu restores the seed data.

## Pages
Dashboard, Profile (skills, education, experience, certs, projects, manual LeetCode/GitHub/Codeforces/HackerRank stats, resume upload),
Job Fit, Resume Lab (ATS check, rejection reasons, project-to-company alignment), **Roadmap** (goal, phases, milestones, pace, re-plan),
Applications (kanban, simulated inbox parsing, bulk add), Mock Interview, Job Market (openings, layoffs, news, placements),
Innovation Lab (12 ideas, 5 live demos), Company portal (overview, talent match, postings).

## Where things live (for the team)

```
src/
  api/         <- THE CONTRACT. One module per service. Replace bodies with fetch()/Amplify calls.
    client.js  <- mock DB (localStorage) + latency. Delete when real backend exists.
    engine.js  <- mock "ML" (matching, ATS, scoring). Each function names the AWS service that replaces it.
  data/        <- seed data, roles, roadmap templates, questions, market sample data
  context/     <- Auth, Data (current user record) and Toast providers
  components/  <- ui.jsx (Card, Ring, Bar, Modal...), Forms.jsx (FormModal, ResumeUploader)
  layout/      <- Sidebar, topbar, demo guide
  pages/       <- one file per screen
```

To connect a real API: keep the function names and return shapes in `src/api/*.js`, change what they do inside.
Pages never talk to the data layer directly, so no UI changes are needed.

## Data honesty
- Market numbers (10 lakh graduates vs 1 lakh openings, competition ratios, placement rates) are **illustrative**. Replace with sourced data (AICTE, NASSCOM, PLFS) before presenting as fact.
- Jobs, layoffs, news and companies are **fictional sample data**.
- Match scores and ATS readiness are estimates, never a probability of being hired.
- Learning-resource links in `data/roadmapTemplates.js` are placeholders; verify before shipping.
