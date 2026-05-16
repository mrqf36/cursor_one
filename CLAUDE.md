# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Preference

Always communicate in Chinese (中文) when responding to the user, including explanations, summaries, and commit messages.

## Project Overview

This is a minimalist Electron desktop application — a Pomodoro Timer with work, short break, and long break modes. The UI is built with plain HTML/CSS/JS (no framework).

## Common Commands

- `npm start` — Run the app in development (launches Electron).
- `npm run build` — Package the app with `electron-builder`. Output goes to `dist/`.

There is no test suite or linter configured.

## Architecture

### Process Model

- **Main process** (`main.js`): Creates a single fixed-size (`400x600`, non-resizable) `BrowserWindow` with `titleBarStyle: 'hiddenInset'`. It registers an IPC handler `show-notification` that triggers native Electron `Notification` popups.
- **Renderer process** (`renderer.js`): All timer logic, UI updates, and state persistence live here. It communicates with the main process via `ipcRenderer.send('show-notification', ...)` to display completion notifications.

### Security Note

`main.js` sets `nodeIntegration: true` and `contextIsolation: false`, and `renderer.js` uses `require('electron')` directly. This is a legacy Electron pattern. If adding untrusted content or third-party scripts, move to `contextIsolation: true` and use a preload script.

### State & Persistence

- Timer state (minutes, seconds, running/paused) is held in memory in `renderer.js`.
- User stats (`completedSessions`, `totalFocusMinutes`) are persisted to `localStorage`.
- There is no backend or database.

### Build Configuration

`electron-builder` config is embedded in `package.json` under the `"build"` key. It bundles `main.js`, `index.html`, `styles.css`, `renderer.js`, and `notification.mp3` (referenced but not present in the repo). The Windows icon is at `static/icon.ico`.
