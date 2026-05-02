# YouLearn — Product Audit

A walk-through of the current product from a user's seat, judged against the stated vision: **a person types a topic and gets a personalized learning path, on the fly.**

---

## Summary

What's actually shipped today is *not* what the vision describes. YouLearn currently is a **one-shot, coding-only, single-path generator**. A user signs up, answers 4 questions, and is locked into the one curriculum Claude produced. The "spin up a path on a new topic" feature — the heart of the vision — has database scaffolding (`paths_created`, `max_free_paths=3`) and is referenced in `docs/token-strategy.md`, but has **zero UI surface**. The dashboard query is `.single()`. The lesson page query is `.single()`. There is no "+ New topic" button. Once a user finishes their first path, the product has nothing more to offer.

The good news: the *primitives* the vision needs are already built. The keyword-wizard step in onboarding (typing a topic → getting 3 distinct profile suggestions from Haiku) is the cleanest, most delightful interaction in the entire app. It just needs to be promoted from "step 1 of onboarding" to "the front door of the product."

---

## What's actually being delivered today

| Vision says | Today delivers |
|---|---|
| User types a topic, gets a path on the fly | One topic, baked in at signup, never replaceable from the UI |
| Pick from existing paths | Each user is alone in a silo with one path. No catalog, no sharing, no library |
| Personalized to the individual | Personalized once, at signup; never updated, never re-asked, never adjustable |
| Optimal user experience | OAuth gate → 5-step wizard → blocking spinner → dashboard with no "what now?" hook |

---

## Walking through it as a first-time user

### 1. Landing page (`/`)
- Hero copy is sharp: *"Your background. Your goals. Your path."*
- "Get started free →" sits next to "**No account required**" — but clicking it goes straight to `/login` which only offers GitHub or Google OAuth. **The copy is dishonest.** Either accept email magic-link / guest-mode, or change the copy to "Sign in with Google or GitHub."
- The 3 feature cards are abstract — *Personalized by Claude / In-browser editor / Real feedback*. None of them communicate the killer demo: **type a topic, watch a path appear**. There's no live demo, no example path, no GIF.
- **Recommendation:** put the keyword-wizard *on the landing page itself*. Let an anonymous visitor type "machine learning" and see Claude generate suggestion profiles in real time. Gate the *commit* behind login, not the *try*.

### 2. Login (`/login`)
- Clean, two-button OAuth (Google / GitHub).
- Tagline: *"No account needed — signing in creates one automatically."* That's truthful (no manual signup form), but it directly contradicts the landing-page promise.

### 3. Onboarding (`/onboarding`)
- **Step 0 — keyword wizard.** Genuinely the best moment in the app. User types a few keywords, hits "Get suggestions," Haiku returns 3 distinct angles (career / project / theory). These are presented as cards.
  - **Issue:** the cards stack `label / background / goals` — three paragraphs of text per card. Visually heavy. A non-technical user reads "I have a CS degree but mostly studied theory…" and thinks "is this what I'm supposed to *say*?" The intent (these are options for *how to frame your situation*) isn't clear.
  - **Issue:** picking a card and hitting "Use this profile →" silently jumps from step 0 to step 3 (language), skipping background+goals. The user is never shown what was filled in on their behalf. There's no "review what we inferred about you" screen.
  - **Issue:** if the user instead clicks "Write my own instead," they're dropped into a 140px empty textarea — exactly the friction the wizard was supposed to remove.
- **Steps 1–4** (background → goals → language → level): standard linear wizard, validated client-side at length≥10. Errors are silent until "Continue" is clicked. Server-side validation (`validatePrompt`) gates against junk; rejection messages are reasonable.
- **Build my learning path** spinner: blocking full-screen *"Just a moment — Claude is structuring your curriculum."* The Haiku stub call is fast (~3–5s) but the wait *feels* longer than it is because nothing visual is happening. The streaming pattern already used for lesson generation should be reused here — show the path title appearing, then course 1, then course 2, etc.

### 4. Dashboard (`/dashboard`)
- Top: path title + 1-line description.
- Middle: 5 course cards with progress rings, lesson previews, "Continue" CTA.
- Right rail: streak widget (7-day heatmap, current streak, longest streak).
- **What's missing:**
  - **No "+ New topic" CTA.** The vision is unbuildable until this exists.
  - **No path picker.** Even if multiple paths existed, the dashboard query `.from('learning_paths').single()` would silently grab one.
  - **No "based on your goal: …" reminder.** The user can't see what Claude understood about them, can't edit it, can't disagree with it.
  - **Streak widget on day 0 looks broken.** 7 grey squares, current=0, best=0, no copy explaining what to do. Should say "Complete a lesson today to start your streak."
  - **"Preparing" courses 2-5** (waiting on lazy generation) show progress 0% with a pulsing badge but no clear instruction. A user clicks one, sees lessons titled "Preparing…", and doesn't know if they should wait, refresh, or come back tomorrow.
- **What works:**
  - Loading skeleton (`dashboard/loading.tsx`) is pixel-faithful — feels instant.
  - Course-card progress ring + accent bar + lesson dots is clean.
  - Streak heatmap is a familiar Duolingo-style pattern.

### 5. Course overview (`/learn/[courseId]`)
- Just a flat numbered list of lessons with difficulty badges and (for completed) a score.
- **What's missing:** any narrative of what the course teaches as a whole. "By the end of this course you'll be able to build a CRUD API" — that kind of orientation. Today the course description is one sentence, and the lesson titles do most of the orientation work.
- **What works:** circles-with-numbers / circles-with-checks for completed is clear and at-a-glance.

### 6. Lesson view (`/learn/[courseId]/[lessonId]`)
- Desktop: 3 panes (sidebar / theory / editor+output).
- Mobile: tabs (Theory / Editor / Output) — but the sidebar still renders. **See "Mobile" section below — this is a critical bug.**
- Lesson header has title, language, difficulty, "Dashboard" link.
- **The Run vs. Submit distinction is unexplained for newcomers.** `TestCasePanel`'s empty state explains it in small body text below an empty panel — easy to miss. A first-timer hits Run, sees green checkmarks on visible tests, doesn't know they need to click Submit to actually advance. Confusion → bounce.
- **Streaming generation view** (when content_status≠'generated') is genuinely impressive — Claude's lesson appears word-by-word with a saving indicator. This is the kind of moment users tell friends about.
- **No way to ask a question.** A real coding tutor lets you raise your hand. No chat, no "explain this differently," no "give me a smaller hint." Personalization is frozen at path-generation; nothing adapts based on the actual struggle.
- **No feedback on failing submissions.** Cost-driven: AI feedback only fires when *all 4* tests pass. From a learner's standpoint this is the worst possible split — when you most need help (you're stuck, half the tests fail), the system says nothing. The token-strategy doc explicitly defends this rule, but it directly hurts the product. Even a tiny hint-only Haiku call ($0.001) on a failed submit would save users from giving up.
- **No retry / regenerate / skip / "this lesson is bad" path.** If Claude hands you a confusing exercise, you're stuck staring at it. There is no "regenerate this lesson," no "skip," no "report bad content."

### 7. After completing the path
- Silence. No "you finished!" celebration. No new path suggestion. No "want to learn something else?" CTA. The product has no second act.

---

## The biggest gap: the vision isn't built

> "A user wanting to generate a personalized learning path for them on a particular topic."

| Building block | Status |
|---|---|
| Schema supports multiple paths per user | ✅ |
| `paths_created` / `max_free_paths` counters | ✅ |
| `create_path_stub` RPC accepts arbitrary input | ✅ |
| Suggestion wizard component | ✅ — but locked inside onboarding |
| `+ New topic` button on dashboard | ❌ |
| Dashboard renders multiple paths | ❌ — `.single()` |
| Path switcher / picker UI | ❌ |
| Path catalog / library / "browse paths others made" | ❌ |
| Way to delete or rename a path | ❌ |
| Way to regenerate a course or lesson | ❌ |

**This is the single most important fix.** Everything else is polish on top of a one-shot product.

---

## The second-biggest gap: it's coding-only

The vision says "a particular topic." Today, every lesson is forced through a Judge0 stdin/stdout exercise. If a user types "history of the Roman Empire" or "music theory" or "graphic design fundamentals," the curriculum will hallucinate a coding exercise around it.

- Lessons need a *type* field: code | quiz | free-text reflection | multi-choice | reading-only.
- The generator should pick the lesson type that fits the topic, not assume code.
- The editor pane should hide when the lesson type isn't code.

This unlocks the product from "another coding platform" into "the way Claude teaches you anything."

---

## Mobile experience

This was tested by reading the Tailwind classes and visualizing the layout — not by running the app on a phone. **You should validate on a real device.**

### Critical
- **Lesson view sidebar (`PathSidebar.tsx`) has no responsive logic.** Renders at fixed `w-64` (256px) on every viewport. On a 360px-wide phone, the sidebar eats 70% of horizontal space, leaving the lesson tabs crammed into the remaining ~30%. The lesson page wrapper is `flex h-screen overflow-hidden` — sidebar and lesson are forced side-by-side regardless of viewport. **The lesson view is unusable on phones today.**
  - Fix: wrap the sidebar in `hidden lg:flex` and put a hamburger button + Sheet drawer for mobile.

### Significant
- **Monaco editor on phone keyboards is brutal.** No tab/indent buttons, no quick-paste of language-specific tokens, default Monaco gestures don't translate to touch. Real phone users will close the tab when they hit the editor.
  - Options: (a) lighter mobile editor, (b) keyboard accessory bar with Tab / : / ( / { / etc., (c) accept that mobile is read-only and surface a "Open on desktop to write code" prompt.

### Minor
- Dashboard top nav (`header`) has theme-toggle + avatar circle + display-name + sign-out — gets tight on narrow phones. Display-name is already `hidden sm:block`. OK at iPhone-13-width but rough on smaller.
- Onboarding wizard `flex gap-3` for Back + Continue could wrap awkwardly on very narrow screens. Minor.

### What's fine
- Landing page (centered hero, single-column features below).
- Login (max-w-sm card).
- Course overview (max-w-2xl flat list).
- Dashboard course-card grid collapses to 1 column at <lg.

---

## What's actually done well

Don't lose these in the rewrite:

- **Lazy lesson generation.** Token-strategy is sharp: pay only when content is consumed. Course 5 lesson 6 stays a $0 stub forever if the user never opens it.
- **Eager first-course generation in onboarding.** Kicked off as `Promise` after the stub returns; by the time the user lands on the dashboard and clicks lesson 1, it's already done. Latency hidden.
- **Streaming lesson view.** SSE-driven, word-by-word theory generation in `StreamingLessonView`. Feels like Cursor/ChatGPT — the kind of moment users remember.
- **Atomic path creation** via `create_path_stub` Postgres RPC. No half-formed paths possible.
- **Hidden test cases on the server only.** Solution code never reaches the client. Correct security hygiene.
- **Loading skeletons** are pixel-faithful to the loaded view — feels instant.
- **Validation pipeline** (`validatePrompt`): regex blocklist → educational-signal allowlist → Haiku YES/NO fallback. Cheap, layered, sensible.
- **The keyword wizard.** This is the soul of the product. It's just buried.

---

## Prioritized recommendations

### P0 — Required to deliver the stated vision
1. **Add a `+ New topic` CTA to the dashboard** that opens the keyword wizard and creates a new path via the same `/api/suggest-prompts` + `/api/onboarding` (rename to `/api/paths`) flow.
2. **Render multiple paths.** Replace `.single()` in `dashboard/page.tsx` and `learn/[courseId]/[lessonId]/page.tsx` with `.order('created_at', { ascending: false })`. Add a tab/switcher at the top.
3. **Promote the keyword wizard to the landing page.** Let unauthenticated visitors type a topic and watch suggestions appear *before* being asked to sign in.

### P1 — Stretches the product toward "Claude teaches you anything"
4. **Lesson types beyond code.** Schema field + generator branch. Hide the editor when not needed.
5. **In-lesson "Ask Claude" chat sheet.** Lesson + current code as context. Cap at N msgs/lesson if cost matters.
6. **Hint-only feedback on failed submits.** A small Haiku call that points at the failing test without giving the answer.
7. **Edit / regenerate / skip / delete affordances.** On paths, courses, and lessons.

### P2 — UX cleanup
8. **Fix the mobile lesson sidebar.** `hidden lg:flex` + Sheet drawer. This is a 30-minute change with huge payoff.
9. **Stream the onboarding path-stub wait.** Show course titles appearing one by one instead of a spinner.
10. **Review screen after picking a wizard suggestion.** Show inferred background + goals, let the user edit, then continue.
11. **Streak widget day-0 empty state.** Copy: "Complete a lesson today to start your streak."
12. **Show "Based on your goal: …" on the dashboard.** Editable. The user should see what Claude understood.
13. **Course completion celebration.** Confetti is fine. Anything > silence.
14. **Honest landing-page CTA copy.** Replace "No account required" with "Sign in with Google or GitHub" (or actually build guest mode — much harder).
15. **Onboarding error messages render inline,** not as red text below the button only after a failed submit.

---

## One-paragraph verdict

YouLearn has built a beautiful, well-engineered, single-shot coding curriculum generator. The hardest technical pieces — atomic path creation, lazy generation, sandboxed code execution, streaming SSE, RLS-locked data — are all done well. **What it has not yet built is the product the vision describes.** The vision is a place where a person can spin up new learning paths on demand, on any topic, and revisit or share them. The current dashboard ships with a permanent "you have one path forever" assumption baked in at the database query level. Closing that gap (P0 items 1–3) is roughly two days of work and would unlock the actual product.
