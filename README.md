# DIADEM Society and OneDIADEM

One small Node app (no dependencies). The same code runs on **Render** (a normal server) and on **Vercel** (serverless). Data lives in a free Upstash Redis database either way.

## What is where
| Site | Who can open it |
|---|---|
| main (homepage, sign in, sign up) | everyone |
| committees (list, next committee) | everyone |
| du, page `/about` (about BP debate) | everyone |
| training, sessions, munsoc, du, allotments, newsletter, forum, applications | OneDIADEM account holders |
| eb (dashboard, `/controls`) | EB members |
| adjudication (dashboard, `/controls`) | adjudicators |
| secretariat (dashboard) | secretariat, with per-person permissions |

Anything a visitor may not open returns a plain "Page not found". There are no links to it.

## What the Secretariat can do without touching code
- **Homepage widgets:** open the homepage, press Edit this page. Add, move, edit or remove Hero, Text, Notice (important notices), Countdown, Cards and the Practice room. Needs the `site` permission.
- **Committees:** Dashboard, Committees. Add, rename or remove committees any time, and set which is next.
- **Allotments:** Dashboard, Allotments. Pick anyone in the registry. They see it in bold on their Allotments page and in the header.
- **Registry:** Dashboard, Registrations. See every sign-up, change roles and permissions, and remove a person (this deletes their account, allotment, applications and forum posts).
- **Applications:** members can apply for EB, adjudicator or Secretariat. Only an admin can decide Secretariat applications, and a new Secretariat member has no permissions until an admin gives them some.
- Documents, portfolio matrices, debate topics, newsletter and forum moderation.

Permissions: members, content, committees, allot, news, apps, forum, site, admin.

## Set up the database (free, once)
Create a free Upstash Redis database and copy its REST URL and REST token. Both hosts need them.

## Deploy on Render (free)
1. Push to GitHub. In Render choose New, Blueprint (uses `render.yaml`), keep the Free plan.
2. Set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and `SECRETARIAT_EMAILS` (comma separated).
3. Open the site and sign up with those emails first. They become secretariat with every permission.

Render free sleeps after about 15 minutes without visitors, and the first visit afterwards takes up to a minute. Live displays update instantly here.

## Deploy on Vercel (free Hobby plan)
1. Import the same GitHub repo in Vercel. No build settings are needed (`vercel.json` does the routing).
2. Add the same three environment variables.
3. Deploy, then sign up with the secretariat emails first.

On Vercel every request reads the data and writes are checked so two people never overwrite each other. Live displays poll every 4 seconds instead of streaming, which uses more of the Upstash free quota. For long live sessions Render is the better host.

## Good to know
- If the database cannot be reached at start-up on Render, the server stops instead of running empty, so it never overwrites your data.
- Sites are folders on one address (`/sessions`, `/eb`, ...). With a domain you own, set `DOMAIN=yourdomain` (Render) to switch to real subdomains.
- Rate limits are per server instance, so on Vercel they are a soft guard.
- The Upstash free plan limits requests and request size. A club-sized database is fine, but check the current limits.

## Run locally
`SECRETARIAT_EMAILS=you@example.com node server.js`, open http://localhost:3000.
