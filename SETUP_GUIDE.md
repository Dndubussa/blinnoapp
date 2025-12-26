# Development Setup & Quick Start

## Installation

```bash
# Install dependencies (includes new testing deps)
npm install

# Start dev server
npm run dev
# Opens on http://localhost:8080 (or next available port)

# Run linter
npm run lint

# Run tests
npm test
npm test:ui       # Interactive test UI
npm test:coverage # Coverage report

# Build for production
npm run build
npm run preview   # Preview production build locally
```

## Testing

Tests are configured with **Vitest** + **React Testing Library**.

### Run Tests

```bash
npm test              # Watch mode (default)
npm test -- --run     # Single run (CI mode)
npm test:coverage     # Generate coverage report
npm test:ui           # Open interactive test UI
```

### Writing Tests

Create files with `.test.tsx` or `.spec.tsx` extension:

```tsx
// src/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Click</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Config Files

- **`vitest.config.ts`** – Vitest configuration (environment, coverage, setup files)
- **`vitest.setup.ts`** – Global test setup (mocks, cleanup)

## Code Organization

### Critical (Not Code-Split)
- Homepage (`/`) – `pages/Index`
- Auth pages – `pages/SignIn`, `pages/SignUp`, etc.
- Product detail – `pages/ProductDetail`
- Legal pages – `pages/TermsOfService`, etc.

### Lazy-Loaded (Code-Split)
- **Buyer Dashboard** (`/buyer/*`) – Lazy imported with `Suspense` fallback
- **Seller Dashboard** (`/seller/*`) – Lazy imported with `Suspense` fallback
- **Admin Dashboard** (`/admin/*`) – Lazy imported with `Suspense` fallback

See [src/App.tsx](src/App.tsx#L1) for route configuration and [src/lib/lazyPages.ts](src/lib/lazyPages.ts) for lazy component definitions.

## Error Handling

All routes are wrapped in an **`ErrorBoundary`** component that:
- Catches unhandled React errors
- Displays a user-friendly error page
- Shows error details in development mode
- Provides "Try again" and "Go home" buttons

See [src/components/ErrorBoundary.tsx](src/components/ErrorBoundary.tsx) for details.

## CI/CD Pipelines

GitHub Actions workflows are configured in `.github/workflows/`:

- **`ci.yml`** – Runs on all PRs and pushes:
  - Install deps
  - Lint (`npm run lint`)
  - Test (`npm test -- --run`)
  - Build (`npm run build`)
  
- **`deploy.yml`** – Deploys on main branch push:
  - Uses Vercel CLI
  - Requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets

### Setting Up Secrets

Go to **GitHub Repo > Settings > Secrets and Variables > Actions** and add:
- `VITE_SUPABASE_URL` – Supabase project URL
- `VITE_SUPABASE_ANON_KEY` – Supabase anon key
- `VERCEL_TOKEN` – Vercel deployment token
- `VERCEL_ORG_ID` – Vercel org ID
- `VERCEL_PROJECT_ID` – Vercel project ID

## Environment Variables

Required for build (add to `.env.local` for local dev):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Troubleshooting

### Port 8080 already in use
The dev server automatically tries the next available port (8081, 8082, etc.). Check the CLI output.

### Dependencies conflict
```bash
rm -rf node_modules package-lock.json
npm install
```

### Tests not running
Ensure Vitest is installed: `npm list vitest`

### Build fails with missing env vars
Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set. The build script checks for these before running Vite.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Uses ES2020 target (configured in `tsconfig.json`)

## Performance Tips

1. **Bundle analysis**: `npm run build` shows a summary
2. **Lighthouse audit**: `npm run preview` then use Chrome DevTools
3. **Code splitting**: Dashboard routes are lazy-loaded automatically
4. **React Query**: Configured to cache data aggressively (5 min stale, 10 min cache)

## Further Reading

- [Vite docs](https://vitejs.dev/)
- [Vitest docs](https://vitest.dev/)
- [React Testing Library docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Tailwind CSS docs](https://tailwindcss.com/)
- [shadcn/ui docs](https://ui.shadcn.com/)
