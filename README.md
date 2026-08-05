# The Clinical Hub

A free, phone-first resource for UK carers, care managers and nurses — everything they need to know, do and stay on top of, in one place.

Built by [Elevate & Thrive](https://elevateandthrive.uk/). Not affiliated with the NMC, CQC or RCN.

## Pages
| File | What it is |
|---|---|
| `index.html` | Hub home — role + nation selector, links to every tool |
| `revalidation.html` | NMC Revalidation Companion — builds the pack across the 8 requirements, exports in the NMC's form format |
| `care-passport.html` | The Care Standard Passport — voluntary "what good looks like" record for carers |
| `cv-tailor.html` | CV Tailor — reshapes a CV for a specific job without changing the facts |
| `resources.html` | Trusted Resources — verified NMC & RCN links |
| `stay-current.html` | News — NMC, RCN, CQC and RCNi. **Generated; do not hand-edit.** |
| `clinical-roles.html` | Live nursing and care vacancies from NHS Jobs. **Generated; do not hand-edit.** |

Installable as an app (PWA) via `manifest.webmanifest` + `sw.js`.

## The two self-refreshing pages

`stay-current.html` and `clinical-roles.html` are rebuilt every Monday and their
contents must not be edited by hand — the next run overwrites anything you type
between the `AUTO:` markers.

* **GitHub Action** (`.github/workflows/refresh-stay-current.yml`, Mondays 06:35
  UTC, laptop-independent) — NMC, RCN and CQC news, plus the HealthJobsUK
  vacancy feed.
* **Cowork task** `clinical-hub-weekly` (Mondays 07:15, needs Lou's Mac) — RCNi
  headlines, read out of the RCNi briefing in Outlook because **rcni.com is
  behind Akamai and 403s every non-browser client**, so it cannot be scraped
  from a runner.

**LinkedIn is deliberately not a source.** Scraping it breaches their terms and
returns HTTP 999 from a datacentre IP anyway; the compliant route is a LinkedIn
job-alert email, which the Cowork task reads like any other alert.

Newsletter links are Adestra redirects tied to Lou's own subscriber record, so
they are resolved to canonical URLs and de-tracked before publication, and the
staged raw email (`_inbox-staging.json`) is gitignored. Full detail:
`02-Elevate-and-Thrive/Process flows for all brands/clinical-hub-news-and-roles-pipeline.md`.

## Status
Preview. The AI-assisted features (reading certificates, reflection and CV rewriting) are labelled "coming soon" until the AI backend is connected. Everything else works.

All content verified against official sources on 17/07/2026.
