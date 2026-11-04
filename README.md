# CareerCraft

Responsive React/Vite career workspace with an Express API server. Existing Resume Analyzer, Interview Prep, Skill Gap Analyzer, Career Roadmap, and dashboard modules remain available alongside the added modules.

## Run locally

1. To enable AI features, copy `server/.env.example` to `server/.env` and set `GEMINI_API_KEY`. The API can also start without it; AI endpoints will explain that the key is missing, while non-AI features remain available.
2. Install backend dependencies with `npm install --prefix server`.
3. Start the API with `npm start --prefix server`.
4. Install frontend dependencies with `npm install`.
5. Start Vite with `npm run dev`.

During local development, Vite proxies `/api` requests to `http://127.0.0.1:5001` so browser requests stay same-origin. For a production build or a separately hosted API, set `VITE_API_BASE_URL` to the API origin before building. The server loads `server/.env` regardless of its launch directory. Never commit `server/.env`.

## Deploy

The app needs separate frontend and API hosting; GitHub Pages alone cannot run the Express server. A straightforward setup is Vercel for the Vite frontend and Render for the API.

1. Push this project to a GitHub repository.
2. In Render, create a Blueprint from that repository. `render.yaml` configures the API service; enter `GEMINI_API_KEY` as a Render secret when prompted. The API can start without this key, but AI features will be unavailable.
3. In Vercel, import the same repository. Use the repository root, build command `npm run build`, and output directory `dist`.
4. The frontend defaults to `https://ai-careerpilot-api.onrender.com` for production. If you use another API host, set `VITE_API_BASE_URL` in Vercel to that HTTPS origin (without a trailing slash), then redeploy the frontend.
5. In Render, set `CORS_ORIGINS` to the exact Vercel site origin (for example, `https://your-project.vercel.app`, without a trailing slash), then redeploy the API.

Keep API keys in the hosting provider's secret settings, never in Vite environment variables or committed files. Vercel preview URLs are not allowed by the API unless added to `CORS_ORIGINS`.

## Added modules and data sources

- **AI Job Matcher:** browser-extracted PDF text plus a pasted job description; Gemini identifies requirements and resume evidence. The score is a transparent matched-required-skills ratio, not a hiring prediction.
- **Internship Finder:** uses Adzuna for broader live listings when `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` are configured in `server/.env`. Without them, it falls back to Himalayas' public no-key API for remote internships and links to the source listing. Himalayas data is refreshed daily and has narrower coverage; source attribution is shown in the UI. [Adzuna setup](https://developer.adzuna.com/) is optional.
- **AI Portfolio Builder:** profile/project editor, templates, preview, AI-written bio, and a downloadable standalone HTML site. Hosting is not configured; download is the supported publish path.
- **AI Project Generator:** Gemini-generated ideas, stacks, development steps, and downloadable README files.
- **Coding Practice Lab:** built-in challenges plus on-demand batches of five original AI-generated problems; generation uses Gemini, while submissions run in an isolated external service, never in Express. Generated problem test data is held in server memory for up to 12 hours. By default, submissions use the public Wandbox endpoint at `https://wandbox.org/api/compile.json` and require no key. This public service has no availability guarantee; submitted source code and test input are sent to Wandbox. Optionally set `JUDGE0_API_KEY` (and provider-specific `JUDGE0_URL` / `JUDGE0_HOST`) to use hosted Judge0 instead, or set `WANDBOX_URL` to a trusted Wandbox-compatible HTTPS endpoint.
- **Skill Development Tracker:** self-reported technical/soft skill updates, locally stored in the browser, with mapped learning resources and progress bars.
- **Career Aptitude Test:** exploratory, unvalidated interest questionnaire, with transparent scoring and optional Gemini guidance.
- **Placement Readiness:** transparent aggregation of locally recorded resume/job-match, coding, skill, and interview progress. Unrecorded areas remain unavailable rather than counting as zero.
- **GitHub Profile Analyzer:** public GitHub API data only. Public unauthenticated limits apply; optional server-side `GITHUB_TOKEN` raises API limits. Private repository access/OAuth is not implemented.
- **AI Career Mentor:** Gemini-backed chat using the profile and career goal; conversation history is held in page memory only.

All AI keys stay server-side. `CORS_ORIGINS` is a comma-separated allowlist for non-local browser origins; localhost development origins are allowed. `GEMINI_MODEL` and `PORT` are optional.

## Privacy and limitations

Resume text and profile data entered into AI tools are sent to the configured Gemini service. Coding submissions and test input are sent to the configured isolated code runner (public Wandbox by default). Internship searches send filters to Adzuna or, when it is not configured, Himalayas; GitHub analysis requests only public profile/repository data. Feature progress and saved items use browser local storage and are not synced to an account. Aptitude results and readiness indicators are guidance, not validated hiring or career predictions.

## Checks

Run `npm run build` and `npm run lint` for the frontend. Run `node --check server/index.js` for a backend syntax check.
