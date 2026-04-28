# Unbiased AI — Fairness in Automated Decisions

A React + Vite + Tailwind v4 site for the hackathon project
**"Unbiased AI Decision — Ensuring Fairness and Detecting Bias in Automated Decisions"**.

The page presents the problem, the four fairness metrics it measures
(Demographic Parity, Disparate Impact, Equal Opportunity, Calibration),
real-world cases where biased models caused harm, and a **Bias Detector**
that lets a user upload a CSV dataset + a `.pkl` model, sends them to a
fairness backend, and renders the result as a Power BI–style dashboard.

## Local development

```bash
cd site
npm install
npm run dev
```

The dev server binds to `0.0.0.0:5000`.

## Production build

```bash
npm run build      # outputs to site/dist
npm run preview    # serves the built dist for sanity-check
```

## Wiring up the backend

The Bias Detector POSTs `multipart/form-data` to:

```
POST  ${window.UNBIASED_API_URL ?? '/api/analyze'}
        - "dataset"  → .csv file
        - "model"    → .pkl file
```

To point the page at your fairness backend, set the global before the app
loads (e.g. inject in `index.html`):

```html
<script>window.UNBIASED_API_URL = "https://your-fairness-api.example.com/audit";</script>
```

Expected JSON response (every field is optional — the dashboard
gracefully degrades with placeholders for anything missing):

```json
{
  "dataset_name": "applicants.csv",
  "model_name": "logreg_v3.pkl",
  "rows": 12450,
  "protected_attribute": "gender",
  "timestamp": "2025-04-27T15:50:00Z",
  "metrics": {
    "demographic_parity": 0.71,
    "disparate_impact": 0.71,
    "equal_opportunity_delta": 0.14,
    "fairness_score": 62
  },
  "verdict": {
    "level": "warn",
    "title": "Borderline — investigate further",
    "text": "Disparate impact is just inside the four-fifths band but equal-opportunity gap is large."
  },
  "groups": [
    { "name": "Male",   "approval_rate": 0.71, "tpr": 0.78, "fpr": 0.18, "count": 6420 },
    { "name": "Female", "approval_rate": 0.51, "tpr": 0.64, "fpr": 0.21, "count": 6030 }
  ],
  "top_features": [
    { "name": "zip_code",     "importance": 0.42 },
    { "name": "credit_score", "importance": 0.31 }
  ],
  "mitigations": [
    {
      "title": "Reweigh training data by group",
      "detail": "Apply instance reweighting so each (group, label) cell carries equal mass before retraining.",
      "severity": "high",
      "category": "preprocessing"
    }
  ]
}
```

There is **no dummy data** — if the backend is unreachable, the dashboard
opens with empty placeholders rather than fabricated numbers.

## Deploy

### Vercel

1. Import the repo into Vercel.
2. Set the **Root Directory** to `site`.
3. Vercel will auto-detect Vite. The included `vercel.json` already
   pins the framework, install/build commands, and output directory.

### Netlify

1. Import the repo into Netlify.
2. The repo-level `site/netlify.toml` pins:
   - `base = "site"`
   - `command = "npm run build"`
   - `publish = "site/dist"`

## Tech

- React 19 + Vite 7
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- jsPDF + html2canvas for the **Download PDF** export of the dashboard
- Animated neural-net particle background, custom dark/futuristic design
  system (see `src/index.css`)

## Project layout

```
site/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── netlify.toml
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css            # full design system + animations
    ├── components/
    │   ├── BgCanvas.jsx     # particle network background
    │   ├── Nav.jsx
    │   ├── Hero.jsx
    │   ├── Problem.jsx
    │   ├── Detector.jsx     # uploads + dashboard + PDF export
    │   ├── MetricsExplained.jsx
    │   ├── HowItWorks.jsx
    │   ├── Cases.jsx
    │   ├── CTA.jsx
    │   ├── Footer.jsx
    │   └── Logo.jsx
    ├── hooks/
    │   ├── useReveal.js
    │   └── useStatCounter.js
    └── lib/
        ├── classify.js      # metric thresholds + formatters
        └── exportPdf.js     # html2canvas + jsPDF report export
```
