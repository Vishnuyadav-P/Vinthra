# Vinthra

Landing page for Vinthra — a student innovation and career platform connecting colleges and students through internships, guided projects, competitions and mentorship.

## Structure

```
index.html      structure & content
css/style.css   design tokens, layout, animation
js/boot.js      runs before first paint: screen profile (data-screen / data-input) + theme
js/main.js      nav, theme toggle, scroll reveal, hero card deck
fonts/          self-hosted Space Grotesk + DM Sans (SIL Open Font License)
vercel.json     privacy & security headers (CSP blocks all third-party requests)
```

## Privacy

The site makes no third-party requests: fonts and scripts are served from this domain,
there are no analytics, cookies or embeds, and the only thing stored is the visitor's
light/dark choice (in their own browser). The Content-Security-Policy in `vercel.json`
enforces this — anything loaded from another domain is blocked. If you ever add a library,
download it into the repo instead of linking a CDN.

## Run locally

No build step — plain HTML/CSS/JS. Either:

- Open `index.html` directly in a browser, or
- Serve it (needed if you later add fetch calls that require http:// origin):
  ```
  npx serve .
  ```
