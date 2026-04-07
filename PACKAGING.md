# Packaging Lit Review Agent for end users

This application is a **Node.js** service (Express) that serves a built **React** SPA from `app/public`, with a local **SQLite** database under `~/.litreview/`. **GROBID** is a separate process for PDF → TEI conversion.

## Windows

- **Portable folder**: Ship a folder containing Node LTS (or instruct users to install Node), the project `npm install` in `app` and root `npm run build`, then a `start.bat` that runs `npm start` from the repo root (or `cd app && npx tsx server.ts` after build).
- **Installer**: Tools such as [Inno Setup](https://jrsoftware.org/isinfo.php) can copy files, optionally bundle a Node runtime, write Start Menu shortcuts, and run `start.bat` on launch.
- **Single executable**: Compilers like `pkg` or `nexe` can bundle Node, but native addons (**`better-sqlite3`**) require matching prebuilt binaries or a rebuild step; test thoroughly on target Windows versions.

Document for users: set **GROBID URL** in Settings (default `http://localhost:8070`) or run GROBID via Docker and paste the LAN URL.

## macOS

- **.dmg / zip**: Same as portable folder; include a shell script that runs `npm start`. Code signing and notarization are required for a smooth Gatekeeper experience if distributing outside the App Store.
- **Heavy option**: Wrap in **Electron** or **Tauri** only if you need a native menu bar and auto-updates; otherwise a small script + Node is simpler.

## GROBID

The installer story should state clearly:

- GROBID is **not** embedded in this repo; users run it locally (Java), via **Docker**, or point the app at a team-hosted instance in **Settings → GROBID URL**.

## Not recommended here

- **PyInstaller** targets Python; this stack is TypeScript/Node. Use it only if you ship a separate Python tool alongside this app.
