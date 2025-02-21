# Safe Protocol Minimal

A web application for safely interacting with smart contracts, allowing users to verify and execute contract calls.

## Tech Stack

- Svelte (75.1%)
- TypeScript (23.0%)
- Vite
- HTML & CSS

## Development

### Prerequisites

- Node.js 20.x or later
- npm (Node Package Manager)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/verichains/safe-protocol-minimal.git
cd safe-protocol-minimal
```

2. Install dependencies:
```bash
npm ci
```

3. Start the development server:
```bash
npm run dev
```

The site will be available at `http://localhost:5173`

### Building

To build the site for production:

```bash
npm run build
```

This will generate a `dist` directory with the built files.

## Deployment

The project is configured to automatically deploy to GitHub Pages when changes are pushed to the `main` branch.

### Setup GitHub Pages

1. Go to your repository's Settings
2. Navigate to "Pages" in the sidebar
3. Under "Build and deployment":
   - Select "GitHub Actions" as the source
4. The site will be automatically deployed on each push to the `main` branch

### Manual Deployment

If you need to deploy manually:

1. Build the project:
```bash
npm run build
```

2. Push your changes to the main branch:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

The GitHub Action will automatically build and deploy your site to GitHub Pages.

## Project Structure

- `/src` - Source code (Svelte & TypeScript files)
- `/public` - Static assets
- `/dist` - Built files (generated)
- `/.github/workflows` - GitHub Actions workflow configuration
