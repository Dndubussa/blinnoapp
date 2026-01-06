# Lovable Migration Guide

This document outlines the Lovable-specific dependencies and configurations used in the Blinno Marketplace project. Use this guide when migrating away from the Lovable framework.

## Lovable-Specific Dependencies

### Current Dependencies
- **`lovable-tagger`** (v1.1.11) – A dev-dependency used for component tracking and tagging in the Lovable IDE.

### Location
- **devDependencies**: [package.json](package.json#L80)
- **Config**: [vite.config.ts](vite.config.ts#L1) – Lovable Tagger plugin integrated into Vite build pipeline.

## Lovable Configuration

### Vite Config
The Vite configuration includes the Lovable Tagger plugin only in development mode:

```typescript
// vite.config.ts
plugins: [
  react(),
  mode === "development" && componentTagger()  // Only in dev
].filter(Boolean)
```

**Action**: When migrating, remove the `componentTagger()` plugin import and usage. It's optional and does not affect production builds or core functionality.

### Environment & Project Metadata
- **Lovable Project ID**: `1d009445-9420-4855-bb29-3ae2fffbb4f2` (see [README.md](README.md#L4))
- **Lovable URL**: https://lovable.dev/projects/1d009445-9420-4855-bb29-3ae2fffbb4f2
- **Note**: All code is stored in Git; Lovable automatically commits changes to this repository.

## Migration Checklist

- [ ] **Remove lovable-tagger from package.json**
  ```bash
  npm uninstall lovable-tagger
  ```

- [ ] **Update vite.config.ts**
  Remove the import and plugin usage:
  ```diff
  - import { componentTagger } from "lovable-tagger";
  
  - plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  + plugins: [react()],
  ```

- [ ] **Verify build still works**
  ```bash
  npm run build
  npm run dev
  ```

- [ ] **Update CI/CD** (if using Lovable's GitHub integration)
  - Switch to standard GitHub Actions workflows (already added in `.github/workflows/`)
  - Configure Vercel deployment directly (see [vercel.json](vercel.json))

- [ ] **Git & Deployment**
  - Lovable auto-commits are disabled when migrating away
  - Use standard Git workflow for all changes
  - Update any Lovable-specific CI integrations

## What Stays (No Changes Needed)

- ✅ **React + TypeScript** – Core framework unaffected
- ✅ **Vite** – Build tool remains the same
- ✅ **Tailwind CSS + shadcn/ui** – UI frameworks work independently
- ✅ **Supabase** – Backend integration unaffected
- ✅ **All application code** – Components, hooks, pages, and utilities remain as-is
- ✅ **Vercel/Netlify deployment** – Hosting configuration works without Lovable

## Post-Migration Benefits

1. **Reduced dependencies**: One fewer dev dependency to maintain
2. **Faster CI/CD**: No Lovable-specific build steps
3. **Full control**: Standard Git + GitHub Actions workflow
4. **Cost savings**: No Lovable subscription fees (if applicable)

## If You Need Lovable Again

If you want to re-integrate Lovable in the future:
1. Reinstall `lovable-tagger`
2. Add the plugin back to `vite.config.ts`
3. Connect this Git repository to Lovable.dev

---

**Last Updated**: December 26, 2025  
**Project**: Blinno Marketplace
