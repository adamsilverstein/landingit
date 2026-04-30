# LandinGit

> _"Land it."_ — the keyboard-first dashboard where every pull request, issue, and review across your repos actually lands, instead of drowning your inbox.

A lightweight, keyboard-driven GitHub PR dashboard built with React and TypeScript. Browse pull requests across multiple repositories with real-time CI status, review state tracking, and vim-style keyboard navigation — all from your browser, your desktop, or your phone.

## Features

- **Multi-repo PR view** — Monitor pull requests across all your repositories in one place
- **CI status at a glance** — Color-coded badges show success, failure, pending, and mixed check states
- **Review tracking** — See approvals, change requests, and comment counts per PR
- **Keyboard-first navigation** — Vim-style `j`/`k` keys, filters, and actions without touching the mouse
- **Filter & sort** — Quickly filter by "mine only," failing CI, or needs review; sort by updated, created, repo, or status
- **Local configuration** — Token and repo settings persist in `localStorage` — no backend required

## Screenshot

<img width="1780" height="1067" alt="image" src="https://github.com/user-attachments/assets/91f25e0e-dc13-437b-af55-9fd16fed3716" />

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later (see `.nvmrc`)
- A way to authenticate to GitHub:
  - **OAuth** (recommended for the desktop and iOS apps) — see [Connecting to GitHub](#connecting-to-github).
  - **Personal Access Token** — fallback for the browser build, or any time OAuth is unavailable.

### Installation

```bash
git clone https://github.com/adamsilverstein/landingit.git
cd landingit
npm install
npm run dev
```

The dev server starts at **http://localhost:5173**. On first visit you'll be prompted to sign in — the dashboard uses GitHub OAuth (Device Flow) by default where available, and falls back to a Personal Access Token otherwise. See [Connecting to GitHub](#connecting-to-github) for setup details.

### Production Build

```bash
npm run build    # Type-checks and builds to dist/
npm run preview  # Preview the production build locally
```

## Connecting to GitHub

The dashboard supports two authentication methods. **OAuth via the GitHub Device Flow is the default** when it's available; a **Personal Access Token** is always offered as a fallback.

| Build target | OAuth available? | Why |
|--------------|------------------|-----|
| Electron desktop | ✅ Yes | Main process proxies the OAuth POSTs (no browser CORS). |
| iOS / mobile | ✅ Yes | Native `fetch` has no CORS restriction. |
| Browser (`npm run dev`, `vite preview`) | ❌ No | GitHub's OAuth endpoints don't return CORS headers; falls back to PAT. |

### Option A — OAuth Device Flow (recommended)

OAuth requires a one-time setup by the project owner: register a GitHub OAuth App and ship its **public** `client_id` with the build. Users then sign in by entering a short code on github.com — no token copy/paste, no `client_secret` required.

1. Register a new OAuth App at [github.com/settings/developers](https://github.com/settings/developers).
   - **Application name:** Git Dashboard
   - **Homepage URL:** anything (e.g. your fork's URL)
   - **Authorization callback URL:** `https://github.com` (Device Flow doesn't use it; GitHub still requires the field)
   - **Enable Device Flow:** ✅ (under app settings)
2. Copy the **Client ID** (the `client_secret` is **not** needed).
3. Provide the client ID to your build:
   - **Web / Electron** — set `VITE_GITHUB_OAUTH_CLIENT_ID=<client_id>` in your shell or in a `.env` file before `npm run build` or `npm run electron:dev`.
   - **Mobile** — set `EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID=<client_id>` (e.g. via `mobile/.env` or [EAS Secrets](https://docs.expo.dev/build-reference/variables/)) before `npx expo run:ios` or an EAS build.
4. Launch the app and click **Connect with GitHub** on the sign-in screen.

If the client ID is unset (or you're running in a plain browser), the sign-in screen automatically falls back to PAT entry.

### Option B — Personal Access Token (fallback)

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** (classic)
3. Give the token a descriptive name (e.g. "LandinGit")
4. Select the **`repo`** scope — this grants read access to pull requests, commits, and check statuses for both public and private repositories
5. Click **Generate token** and copy the value
6. Paste the token into the dashboard's setup screen and click **Save & Continue**

> **Tip:** You can also use a [fine-grained token](https://github.com/settings/tokens?type=beta) scoped to specific repositories with **Pull requests** (read) and **Checks** (read) permissions.

The active connection method (OAuth or PAT) is shown next to the **Sign out** button on the desktop/web header and in the **Account** section of the iOS Settings tab.

## Keyboard Shortcuts

Press **`?`** at any time to open the in-app help modal.

| Key | Action |
|-----|--------|
| `j` / `↓` | Move cursor down |
| `k` / `↑` | Move cursor up |
| `Enter` | Open selected PR in browser |
| `r` | Refresh data |
| `m` | Toggle "mine only" filter |
| `f` | Cycle filter (all → failing → needs-review) |
| `s` | Cycle sort (updated → created → repo → status) |
| `c` | Open repo configuration |
| `?` | Toggle help modal |
| `Esc` | Close open modal |

Shortcuts are automatically disabled while typing in input fields.

## Configuration

All settings are stored in the browser's `localStorage` — nothing is sent to a server.

| Key | Description |
|-----|-------------|
| `gh-dashboard-token` | Your GitHub access token (OAuth `gho_…` or PAT `ghp_…`/`github_pat_…`). |
| `gh-dashboard-config` | JSON object containing repos and display preferences |

The config object has the following shape:

```json
{
  "repos": [
    { "owner": "facebook", "name": "react", "enabled": true }
  ],
  "defaults": {
    "sort": "updated",
    "filter": "all",
    "maxPrsPerRepo": 30
  }
}
```

To reset the dashboard, clear these keys from `localStorage` in your browser's developer tools or sign out via the header button.

## Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b my-feature`)
3. Make your changes
4. Run the build to catch type errors (`npm run build`)
5. Commit your changes (`git commit -m 'Add my feature'`)
6. Push to your branch (`git push origin my-feature`)
7. Open a Pull Request

### Tech Stack

- **React 18** — UI framework
- **TypeScript** — Type safety
- **Vite** — Dev server and bundler
- **@octokit/rest** — GitHub API client

## License

This project is open source. See the repository for license details.
