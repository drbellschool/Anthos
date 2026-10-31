# Anthos Deep Dive curriculum database — twelve-petal catalog

**As of 31 Oct 2026, the agreed content organization is 12 petals × 10 proposed story concepts = 120 catalog records. The titles are not 120 authored experiences.**

## Catalog boundary

- `anthos_petals`: exactly twelve relationship domains, in a suggested display order rather than a required annual order. Couples may personalize their month-by-month sequence.
- `deep_dive_stories`: unique `slug` plus `story_version`, title, learning objective, research lenses, and an editorial status: `draft`, `in_review`, `published`, `retired`. A draft is only a title and teaching goal.
- `deep_dive_chapters`: authored eight-milestone narrative, six options when a decision is required, realistic consequences and coaching, independent chapter seven, branching endings on chapter eight.
- `deep_dive_progress` stays separate and participant-owned. The catalog adds referential integrity for story key/version; it does **not** grant customers progress writes.

## Content counts expected after migration

- **12** enabled petals.
- **120** story outlines: **119 draft**, **1 in_review**.
- **8** authored chapters and **6** Chapter 8 endings, all for **Christmas Tug-of-War**.
- **0** published stories and **0** created customer progress records. No customer enrollments are enabled by this migration.

## Source and research

The authored story is imported exactly from `content.js` in Deep Dive PR #18 (branch `feature/deep-dive-engine-v1`). The other 119 concepts were drafted during the Anthos twelve-petal curriculum discussion. Curriculum influence labels describe inspiration from Gottman, Schnarch and Aron and do not imply researcher endorsement or clinically validated learning results.

The revised taxonomy includes: Friendship & Admiration; Communication & Understanding; Conflict & Repair; Emotional Safety & Vulnerability; Romance & Courtship; Desire & Physical Intimacy; Trust & Commitment; Partnership & Family; Money & Stewardship; Faith & Purpose; Adventure & Play; Individuality & Growth.

**A Day Through Our Eyes** remains a Paraclete/Anthos Moments photo adventure (issue #10) rather than a fictional Deep Dive.

## Production and security controls

- These tables have RLS enabled and no public/anonymous/authenticated client grants. Read/write is service-side only until a properly authorized read API is built.
- Story publication is an **editorial workflow**, not an automatic consequence of having a row. In addition to at least eight chapters, six sensible options per decision and six endings, the publisher must validate objective, consent, safety, choice quality, version, language, and consistency. These checks are currently **not implemented** as a production publisher.
- Future publishing must never overwrite a published version; add a new `story_version`. Progress records reference specific versions.
- Real private progress and Sophia delivery depend on account authentication and server-authoritative choice evaluation (see account PR #17, engine PR #18, story engine issue #19). No SMS or payments are introduced.
- The order corresponds to a 12-month motif. It is not a requirement that all twelve be completed by a certain deadline or that ten stories per petal be finished.

## SQL migrations

1. `20261031050000_anthos_deep_dive_library.sql`: schema, constraints and RLS.
2. `20261031050001_seed_twelve_petals_and_120_outlines.sql`: 12 categories and 120 outlines, draft only.
3. `20261031050002_seed_christmas_tug_of_war.sql`: full source-authored story from PR #18.

## Acceptance evidence

Verify counts using:

```sql
select p.name, count(s.id) as story_outlines
from public.anthos_petals p
left join public.deep_dive_stories s on s.petal_slug=p.slug
group by p.name,p.sort_order order by p.sort_order;

select status,count(*) from public.deep_dive_stories group by status;

select s.slug,count(c.id) as chapters,
       count(*) filter(where c.is_independent_mastery) as mastery_chapters
from public.deep_dive_stories s
left join public.deep_dive_chapters c on c.story_id=s.id
where s.slug='christmas-tug-of-war'
group by s.slug;

select count(*) as participant_progress_records from public.deep_dive_progress;
```

Do not count draft outlines as ready to deliver or increase paid-launch readiness just because the catalog exists.
