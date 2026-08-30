# LocalNote

**LocalNote** is an offline-first note-taking application that lets you capture rich-text notes, trackable checklists, and calendar events — all stored locally on your device with zero cloud dependency. Built with React, TypeScript, Capacitor, and SQLite.

---

## Features

### 📝 Notes

- Rich-text editing powered by **Tiptap / ProseMirror**
  - Bold, italic, underline, strikethrough, code, blockquotes, lists, and inline links
  - Content stored as clean HTML in a local SQLite database
- Color-coded labels for quick visual grouping

### ✅ Checklists

- Dedicated checklist editor with inline item management
- Reorder items with **drag-and-drop** (`@dnd-kit`)
- Track completion progress at a glance

### 📅 Calendar &amp; Events

- Monthly calendar view with day-level detail
- Create events with start/end times, all-day support, and descriptions
- Optional **reminders** with configurable offsets (5 min → 1 day) that fire as native local notifications
- Optional **long alarm** sound for important events (Android)
- Links support on events

### 📁 Folders

- Organize notes, checklists, and events into color-coded folders
- Drag-and-drop reordering of folders
- Per-folder item counts

### 🔍 Search

- Search across note titles and contents
- Configurable scope: all fields, titles only, or contents only

### 🎨 Appearance

- Three theme modes: **Light**, **Dark**, and **System** (auto)
- Three font sizes: **Small**, **Default**, and **Large**
- Responsive layout with a desktop sidebar and mobile bottom navigation

### 💾 Backup &amp; Restore

- Export all local data (notes, checklists, events, folders, attachments, reminders, settings) to a single JSON file
- Import a backup file to restore or migrate data between devices
- Real-time local database statistics

### 🔒 100% Offline

- All data stays on-device — no accounts, no tracking, no analytics, no external API calls
- SQLite database with version-controlled **migrations** for safe upgrades
- Works on web, Android, and iOS

---

## Tech Stack


| Layer               | Technology                                                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Runtime**         | React 19, TypeScript                                                                                                                                |
| **Build**           | Vite 6                                                                                                                                              |
| **Styling**         | Tailwind CSS 4                                                                                                                                      |
| **Routing**         | React Router DOM 7                                                                                                                                  |
| **Database**        | [@capacitor-community/sqlite](https://github.com/capawesome-team/capacitor-sqlite) + [sql.js](https://sql.js.org/) (web fallback via `jeep-sqlite`) |
| **Rich Text**       | Tiptap / ProseMirror                                                                                                                                |
| **Drag &amp; Drop** | `@dnd-kit`                                                                                                                                          |
| **Mobile**          | Capacitor 6 (Android / iOS)                                                                                                                         |
| **Notifications**   | @capacitor/local-notifications                                                                                                                      |
| **Testing**         | Vitest, React Testing Library, jsdom                                                                                                                |
| **Linting**         | ESLint 9 + TypeScript ESLint                                                                                                                        |
| **Fonts**           | Inter (body) &amp; JetBrains Mono (monospace)                                                                                                       |
| **Icons**           | Material Symbols Outlined (Google)                                                                                                                  |


---

## Getting Started

### Prerequisites

- **Node.js** 20+ (with npm)
- **Android Studio** (optional, for native Android builds)
- **Xcode** (optional, for native iOS builds)
- Android SDK with `adb` on your `PATH` (for installing builds on a device)

### Installation

```bash
# Clone and install dependencies
git clone https://github.com/YinkaEnoch/localnote local-note
cd local-note

npm install
```

### Running locally (web)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the app runs in the browser using `jeep-sqlite` as the web storage layer, so all data stays in your browser and is never sent anywhere.

### Building for production

```bash
npm run build
```

The compiled output is written to `dist/`.

### Running tests

```bash
npm test          # run once
npm run test:watch # watch mode
```

### Type-checking &amp; linting

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
```

---

## Project Structure

```
local-note/
├── public/                 # Static assets (icons, fonts, wasm)
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── layout/         # AppLayout, TopBar, Sidebar, Drawer, BottomNavBar
│   ├── pages/              # Route-level pages (home, editors, calendar, search, etc.)
│   ├── database/           # SQLite connection, migrations, and repositories
│   │   ├── repositories/   # Type-safe data-access layer per table
│   ├── services/           # Cross-cutting services (reminders, notifications)
│   ├── theme/              # Theme provider, tokens, global CSS
│   ├── plugins/            # Native Capacitor plugins / abstractions
│   ├── hooks/              # Custom React hooks
│   ├── types/              # Shared TypeScript interfaces
│   ├── App.tsx             # Root app with routes
│   └── main.tsx            # DOM entry point
├── android/                # Capacitor-generated Android project
├── capacitor.config.ts     # Capacitor configuration
├── vite.config.ts          # Vite + Tailwind + React plugin config
├── tsconfig.app.json       # TypeScript config
├── eslint.config.js        # ESLint config
└── package.json
```

### Data Model

All data lives in a **SQLite database** (`localnote.db`) with version-controlled migrations. The schema covers:


| Table             | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| `notes`           | Rich-text notes and checklists (by `type`)         |
| `checklist_items` | Individual checklist items (linked to notes)       |
| `events`          | Calendar events with dates, reminders, sounds      |
| `folders`         | Folder definitions (name, color)                   |
| `attachments`     | File attachments linked to notes or events         |
| `reminders`       | Scheduled reminder records (notification tracking) |
| `settings`        | User preferences (theme, font size, etc.)          |
| `schema_version`  | Tracks the current migration version for upgrades  |


> **Migrations** live in [`src/database/migrations.ts`](src/database/migrations.ts) and run automatically on app startup via `DatabaseProvider`.

---

## Deploying to Mobile (Android)

LocalNote uses [Capacitor](https://capacitorjs.com/) to compile the web app into a native Android application.

```bash
# Build the web assets and sync the native project
npm run build:android        # builds web + runs ./gradlew assembleDebug

# Or step-by-step:
npm run build
npx cap sync
```

The debug APK is produced at `android/app/build/outputs/apk/debug/app-debug.apk` and can be installed directly on a connected device with `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.

### iOS

```bash
npm run build
npx cap sync ios
npx cap open ios   # opens Xcode
```

---

## Settings

Preferences are persisted locally in the `settings` table:

- **Theme** — `system` (auto), `dark`, or `light`
- **Font size** — `small`, `default`, or `large`

---

## Backup &amp; Restore

Export and import are available from **Settings → Backup**. Exporting writes a JSON file containing every table's contents; importing replaces all local data with the file's contents. This is useful for migrating between devices or doing a local backup.

> ⚠️ **Import replaces all existing data.** The import flow warns before proceeding.

---

## Development Notes

- The app supports **three runtime targets**: web (via `jeep-sqlite`), Android, and iOS. Platform-specific code guards native-only calls using `Capacitor.getPlatform()`.
- The native SQLite plugin is used on Android/iOS; `sql.js` runs in a WebAssembly worker on the web via `jeep-sqlite`.
- Drag-and-drop is used for reordering checklist items and folders.
- All dates are stored as ISO 8601 strings and handled in local time for calendar display.

---

## License

[ISC](LICENSE) — see [`package.json`](package.json) for author details.