# Contributing

Thank you for your interest in contributing to Ghost Phrase Complement!  
This document explains the basic flow for contributing. Keep it simple and feel free to adjust this file for your project.

---

## How to report bugs and request features

- For **bugs**, please open a new Issue and use the **"Bug report"** template.
- For **feature requests or improvements**, please use the **"Feature request"** template.
- Before creating a new Issue, please check if a similar Issue already exists.

When filing an Issue, try to include:

- A clear and concise summary
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Screenshots or console logs, if helpful
- Your environment (OS, Chrome version, extension version)

---

## Development setup

1. **Fork** this repository and **clone** your fork locally:

   ```bash
   git clone https://github.com/your-username/Ex-Chrome-ghost-complement.git
   cd Ex-Chrome-ghost-complement
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Open the project in your editor and make sure you can see the `src/` directory.

---

## Running the extension locally in Chrome

1. Build the extension:

   ```bash
   npm run build
   ```

   For development with watch mode:

   ```bash
   npm run watch
   ```

2. Open the extensions page in Chrome:
   - Enter `chrome://extensions/` in the address bar
   - Toggle **"Developer mode"** on in the top right corner
   - Click **"Load unpacked"**

3. Select the `dist/` folder of this repository.

4. When you change the code, the watch mode will automatically rebuild. Press **"Update"** (or the refresh icon) on the extensions page to reload and verify the behavior.

---

## Coding style & guidelines

- Follow the existing code style (indentation, naming, file structure, etc.).
- Run the linter and formatter before committing:

  ```bash
  npm run lint:fix
  npm run format
  ```

- Check for type errors:

  ```bash
  npm run typecheck
  ```

- Aim for small and clear commit messages.

Example:

```bash
git commit -m "Fix: handle null tab in background script"
```

---

## Making changes

1. Create a branch from `main`:

   ```bash
   git switch -c feature/update-popup-ui
   ```

2. Make necessary changes under `src/`. Run linter and type checks as needed.

3. Commit with a message explaining your changes.

4. Push to your GitHub repository:

   ```bash
   git push origin feature/update-popup-ui
   ```

---

## How to submit a Pull Request

1. Create a **Pull Request (PR)** on GitHub from your branch to the `main` branch of this repository.
2. In the PR body, fill it out according to the provided **Pull Request Template**:
   - Summary of changes
   - Key changes
   - Related Issues (e.g., `Closes #123`)
   - Details of tests or manual verification performed
3. If you receive review comments, make necessary corrections and push to the same branch. The PR will be updated automatically.

---

## Thank you

Thank you for considering contributing to Ghost Phrase Complement!  
Bug reports, suggestions, document fixes, and any small contributions are welcome.
