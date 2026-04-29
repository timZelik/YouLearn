# YouLearn Token Usage Strategy

Goal: spend tokens only when a user is about to consume content they've expressed intent for.
Never pre-generate. Never regenerate. Cache everything forever.

---

## The Rule

> A Claude API call fires if and only if the user is **about to view or submit** content that doesn't exist yet.

---

## Generation Triggers — What Gets Generated When

### 1. Onboarding (one call)
**Trigger:** user submits the 4-question form  
**Generate:** learning path title + description + course stubs (title, description, difficulty, order_index only — no lessons)  
**No lessons, no test cases, no theory.**

Approximate output: ~300 tokens. Cost: negligible.

```
path
  course 0 — title + description        (status: pending)
  course 1 — title + description        (status: pending)
  course 2 — title + description        (status: pending)
  ...
```

---

### 2. First time a user opens a lesson (per-lesson call)
**Trigger:** `GET /learn/[courseId]/[lessonId]` and lesson has no `theory_markdown`  
**Generate:** theory, exercise prompt, starter code, solution code, test cases for **that one lesson only**  
**Mark lesson status: generated**

This is the only expensive call. Budget: ~1500–2000 tokens output per lesson.

If the user never opens Lesson 3, Lesson 3 costs $0.

---

### 3. User completes a course (one call, deferred)
**Trigger:** all lessons in a course marked `completed`  
**Generate:** lesson stubs (title, description, order_index) for the next course only  
**No content yet — just the course map.**

This primes the dashboard so the next course appears, but costs almost nothing.

---

### 4. User explicitly requests a new topic (one call)
**Trigger:** user clicks "Start a new topic" on dashboard  
**Generate:** new learning path stub + first course stubs (same as onboarding, no lessons)  
**Gate:** check `profiles.paths_created < max_free_paths` before calling

---

## What Never Triggers a Claude Call

- Opening the dashboard
- Viewing a course overview page
- Running code (Judge0 only)
- Submitting code — **unless** the submission passes all tests, in which case:
  - Generate AI feedback (small call, ~500 tokens output)
  - This is the reward, not a default

AI feedback on every run/submit would 10x token costs. Only trigger it on a passing full submit.

---

## Caching Rules

| Content | Cache policy |
|---|---|
| Lesson theory/code/tests | Write once, never regenerate |
| AI feedback | Stored per submission, never regenerated |
| Course stubs | Write once on path creation |
| Learning path | Immutable after creation |

If a lesson already has `theory_markdown`, skip the API call entirely. Always check DB first.

---

## Free Tier Caps

Tracked on `profiles`:

| Field | Default | Meaning |
|---|---|---|
| `paths_created` | 0 | How many learning paths the user has started |
| `max_free_paths` | 3 | Max paths (3 × 101 topics, or 1 full curriculum = 3) |

A "full curriculum" (5 courses) counts as 3 path credits to reflect the higher eventual lesson generation cost.

Lesson generation within an allowed path is always permitted — the cap is on starting new paths, not on lesson depth.

---

## Estimated Cost Per Active User

| Action | Claude tokens | Est. cost |
|---|---|---|
| Onboarding (path + stubs) | ~500 in / ~300 out | ~$0.006 |
| Per lesson opened | ~800 in / ~1800 out | ~$0.030 |
| AI feedback (passing submit) | ~600 in / ~500 out | ~$0.010 |
| Full 101 course (5 lessons, all opened, 2 feedbacks) | — | ~$0.17 |
| Full curriculum (25 lessons, all opened, 10 feedbacks) | — | ~$0.85 |

A user who signs up, does onboarding, and never opens a lesson: **$0.006 total.**

---

## Implementation Notes

- Lesson generation should be triggered server-side on the lesson page's route handler, not client-side
- Show a loading state ("Preparing your lesson...") on first open — streaming helps here
- Set a `generating` flag on the lesson row to prevent duplicate API calls if the user refreshes mid-generation
- Never expose `solution_code` to the client — it lives in the DB and is only used server-side by the Judge0 comparison logic
