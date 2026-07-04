# Net Worth Tracker

A private, offline personal net worth tracker. Plain HTML/CSS/JS — no frameworks, no build step, no network calls. All data stays in `localStorage` on your device.

Install it on iPhone via **Add to Home Screen** for a full-screen standalone app that works offline.

## Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `AssetTracker`).
2. Push this folder to the repo:
   ```bash
   git init
   git add .
   git commit -m "Initial net worth tracker PWA"
   git branch -M main
   git remote add origin git@github.com:YOUR_USERNAME/AssetTracker.git
   git push -u origin main
   ```
3. On GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Choose branch **main** and folder **/ (root)**, then **Save**.
6. After a minute, the site is live at `https://YOUR_USERNAME.github.io/AssetTracker/`.

### Install on iPhone

1. Open the GitHub Pages URL in **Safari**.
2. Tap the **Share** button → **Add to Home Screen**.
3. Launch from the home screen icon — it runs full-screen, offline, with a black-translucent status bar.

### Updating the app

When you change any file (`index.html`, icons, `sw.js`, etc.):

1. Bump `CACHE_VERSION` in `sw.js` (e.g. `'v1'` → `'v2'`).
2. Commit and push.
3. On iPhone, force-quit the app and reopen it (or wait for the service worker to activate).

## How the math works

**Goal** at any moment is the sum of every principal event grown to that date:

```
goal = Σ amount × (1 + rate)^(elapsed years)
```

Elapsed time uses daily precision: milliseconds elapsed ÷ milliseconds per year (`365.25 × 24 × 60 × 60 × 1000`).

**Delta** = actual value − goal. Contributions add new principal events, so they raise the goal baseline too — the delta measures pure growth performance, not new deposits.

### Example

| Input | Value |
|-------|-------|
| Principal | $100,000 |
| Annual growth rate | 8% |
| Elapsed time | 6 months (0.5 years) |

```
goal = $100,000 × (1.08)^0.5
     = $100,000 × 1.03923…
     ≈ $103,923
```

If your actual value is $105,000, you're **+$1,077 ahead**. If it's $102,000, you're **−$1,923 behind**.

## Data model

Everything is stored in `localStorage` under the key `networthTracker` as a single JSON object:

```json
{
  "growthRate": 0.08,
  "principalEvents": [
    { "timestamp": 1710000000000, "amount": 100000 }
  ],
  "checkIns": [
    { "timestamp": 1710000000000, "value": 100000, "contribution": 0 }
  ]
}
```

- **principalEvents** — initial value plus each contribution (positive or negative) at its timestamp.
- **checkIns** — every snapshot: total value and optional contribution since the last check-in.

## Local development

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` in your browser. Use Safari's responsive mode or a real device to test PWA install behavior.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App UI, styles, and logic (all inline) |
| `sw.js` | Service worker — cache-first offline support |
| `manifest.json` | Web app manifest for installability |
| `apple-touch-icon.png` | 180×180 iOS home screen icon |
| `icon-192.png` / `icon-512.png` | PWA manifest icons |