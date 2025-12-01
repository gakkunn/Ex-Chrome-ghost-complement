# Ghost Phrase Complement

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

## Overview

Ghost Phrase Complement is a Chrome extension that provides intelligent phrase autocompletion for AI chat interfaces.

- Displays ghost text suggestions for English phrases as you type
- Press Tab to instantly accept completions
- Works seamlessly across ChatGPT, Gemini, and Claude

This is an open-source extension implemented based on Chrome Extension Manifest v3.

---

## Features

- **Ghost Text Autocompletion**: Shows translucent suggestion text inline as you type
- **Tab to Accept**: Simply press Tab to confirm and insert the suggested phrase
- **Multi-Site Support**: Works on ChatGPT (chatgpt.com, chat.openai.com), Gemini (gemini.google.com), and Claude (claude.ai)
- **Per-Site Toggle**: Enable or disable the extension for each supported site via the popup
- **Custom Phrases**: Store and manage your own frequently used phrases
- **Escape to Dismiss**: Press Escape to hide the current suggestion

---

## Screenshots

<!-- Update this section when you add images -->

| Screen                                          | Description                   |
| ----------------------------------------------- | ----------------------------- |
| ![screenshot-1](./docs/images/screenshot-1.png) | Ghost text suggestion example |
| ![screenshot-2](./docs/images/screenshot-2.png) | Popup settings interface      |

---

## Installation

> ℹ️ **Not yet published to the Chrome Web Store.**  
> You can use it via "Local Installation (Developer Mode)" below.

### 1. Clone the repository

```bash
git clone https://github.com/gakkunn/Ex-Chrome-ghost-complement.git
cd Ex-Chrome-ghost-complement
```

### 2. Install dependencies & Build

```bash
npm install
npm run build
```

### 3. Install to Chrome (Developer Mode)

1. Open Chrome
2. Go to `chrome://extensions/`
3. Toggle **"Developer mode"** on in the top right corner
4. Click **"Load unpacked"**
5. Select the `dist/` folder of this project

---

## Usage

1. After installing the extension, pin the icon from the Chrome toolbar.
2. Navigate to ChatGPT, Gemini, or Claude.
3. Start typing in the input field - ghost text suggestions will appear as you type English phrases.
4. Press **Tab** to accept the suggestion, or continue typing to dismiss it.
5. Press **Escape** to manually dismiss the current suggestion.
6. Click the extension icon to toggle the feature on/off for the current site.

---

## Development

### Prerequisites

- Node.js: >= 18.x
- npm

### Setup

```bash
git clone https://github.com/gakkunn/Ex-Chrome-ghost-complement.git
cd Ex-Chrome-ghost-complement

npm install
npm run build    # Production build
npm run watch    # Development with watch mode
```

### Available Scripts

| Script             | Description                       |
| ------------------ | --------------------------------- |
| `npm run build`    | Build the extension               |
| `npm run watch`    | Build with watch mode             |
| `npm run lint`     | Run ESLint                        |
| `npm run lint:fix` | Run ESLint with auto-fix          |
| `npm run format`   | Format code with Prettier         |
| `npm run typecheck`| Run TypeScript type checking      |
| `npm run check`    | Run linting and format checking   |

---

## Project Structure

```text
Ex-Chrome-ghost-complement/
  src/
    content-scripts/    # Main content script (ghost text logic)
    popup/              # Extension popup UI
    styles/             # CSS styles
    types/              # TypeScript type definitions
    utils/              # Utility functions (storage, etc.)
  public/
    icons/              # Extension icons
    manifest.json       # Chrome Extension Manifest v3
    popup.html          # Popup HTML
  dist/                 # Build output (generated)
  scripts/
    build.mjs           # Build script using esbuild
  package.json
  tsconfig.json
  eslint.config.js
  README.md
  LICENSE
```

---

## Contributing

Bug reports, feature suggestions, and pull requests are welcome 🎉

Please refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

Quick steps:

1. Check Issues; create a new one if it doesn't exist
2. Fork the repository
3. Create a branch (e.g., `feat/xxx`, `fix/yyy`)
4. Commit changes and push
5. Create a Pull Request

---

## License

This project is released under the [MIT License](./LICENSE).

