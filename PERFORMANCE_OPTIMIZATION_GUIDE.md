# Performance Optimization Guide

## Current Bundle Analysis

### Main Bundle Size
- **Current estimate:** ~200-300KB gzipped
- **Target:** <150KB gzipped
- **Reduction needed:** 40-50%

## Optimization Strategies

### 1. Code Splitting (Already Implemented ✅)

**Status:** Partially done
- ✅ Dashboard routes lazy loaded
- ❌ Large components (Checkout) not split

**Action Items:**
```typescript
// ❌ Current (1476 lines in single file)
export default function Checkout() { ... }

// ✅ Recommended
// src/pages/checkout/Checkout.tsx
export default function Checkout() { ... }

// src/pages/checkout/ShippingForm.tsx
export function ShippingForm() { ... }

// src/pages/checkout/PaymentMethod.tsx
export function PaymentMethod() { ... }

// src/pages/checkout/OrderSummary.tsx
export function OrderSummary() { ... }
```

### 2. Dependency Optimization

#### Heavy Dependencies to Review
```json
{
  "mapbox-gl": "3.17.0 → Consider lazy loading only on admin/analytics",
  "recharts": "2.15.4 → Used only in dashboards, lazy load",
  "jspdf": "3.0.4 → Used only for receipts, lazy load",
  "framer-motion": "12.23.25 → Replace with CSS animations where possible"
}
```

**Implementation:**
```typescript
// Lazy load heavy libraries
const MapboxMap = lazy(() => import("./MapboxMap"));
const Analytics = lazy(() => import("./Analytics"));
const PDFGenerator = lazy(() => import("./PDFGenerator"));

// In component
import { Suspense } from "react";

export function Dashboard() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Analytics />
    </Suspense>
  );
}
```

### 3. Library Replacements

| Current Library | Size | Alternative | Size | Savings |
|---|---|---|---|---|
| framer-motion | ~35KB | CSS animations | ~0KB | 35KB |
| recharts | ~45KB | nivo/visx | ~25KB | 20KB |
| mapbox-gl | ~65KB | maplibre | ~45KB | 20KB |
| jspdf | ~85KB | html2pdf | ~50KB | 35KB |

### 4. Tree Shaking

#### Check for unused imports
```bash
# Install bundle analyzer
npm install -D rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  // ... other plugins
  visualizer({ open: true })
]

# Build and analyze
npm run build
# Opens HTML report of bundle contents
```

### 5. Lazy Loading Strategy

#### Priority: Critical Path (Load Immediately)
```
- Home page
- Auth pages (SignIn, SignUp)
- Product listing
- Product detail
- User profile
```

#### Priority: Secondary (Lazy Load)
```
- Dashboard routes (seller, admin, buyer)
- Analytics
- Messages
- Order tracking
```

#### Priority: Tertiary (On-Demand)
```
- PDF generation
- Map visualizations
- Advanced analytics
- Data exports
```

### 6. Code Splitting Implementation

**Current vite.config.ts:**
```typescript
// Add manual chunks
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'radix-vendor': ['@radix-ui/...multiple...'],
          'utils': ['zod', 'clsx', 'date-fns'],
          
          // Feature chunks
          'payment': ['supabase'],
          'analytics': ['recharts'],
          'mapping': ['mapbox-gl'],
        }
      }
    }
  }
});
```

### 7. Image Optimization

```typescript
// Lazy load images with IntersectionObserver
export function OptimizedImage({ src, alt }: ImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setImageSrc(src);
        observer.unobserve(entry.target);
      }
    });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [src]);

  return <img ref={ref} src={imageSrc} alt={alt} />;
}
```

### 8. React Performance

#### Memoization
```typescript
import { memo, useMemo, useCallback } from "react";

// Memoize expensive components
export const ProductCard = memo(({ product }: Props) => (
  <div>...</div>
));

// Memoize callbacks
const handleAddToCart = useCallback((id: string) => {
  // ... handler logic
}, [dependencies]);

// Memoize computed values
const total = useMemo(() => {
  return items.reduce((sum, item) => sum + item.price, 0);
}, [items]);
```

#### Virtual Scrolling
```typescript
import { FixedSizeList } from "react-window";

export function ProductList({ items }: Props) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={100}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ProductCard product={items[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### 9. Network Optimization

#### Request Batching
```typescript
// ❌ Bad: Multiple sequential requests
const products = await fetchProducts();
const reviews = await fetchReviews();
const seller = await fetchSeller();

// ✅ Good: Parallel requests
const [products, reviews, seller] = await Promise.all([
  fetchProducts(),
  fetchReviews(),
  fetchSeller(),
]);
```

#### Caching Strategy
```typescript
// React Query already configured, but ensure:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes
      refetchOnWindowFocus: false,      // ✅ Already set
      refetchOnMount: false,             // ✅ Already set
      retry: 1,                          // ✅ Already set
    },
  },
});
```

### 10. CSS Optimization

#### Remove unused styles
```bash
# Install Tailwind CSS purge
npm install -D @tailwindcss/typography

# tailwind.config.ts already has:
content: ["./src/**/*.{ts,tsx}"]

# Verify unused classes are removed in production build
npm run build -- --analyze
```

## Implementation Roadmap

### Week 1: Quick Wins (2-3 hours)
- [ ] Remove unused dependencies
- [ ] Update tree-shaking config
- [ ] Lazy load MapBox and Recharts
- [ ] Memoize expensive components
- Expected savings: **20-30KB**

### Week 2: Code Splitting (4-6 hours)
- [ ] Split Checkout into sub-components
- [ ] Split Dashboard pages
- [ ] Add manual chunks to Vite config
- Expected savings: **40-60KB**

### Week 3: Library Replacement (4-8 hours)
- [ ] Evaluate framer-motion alternatives
- [ ] Replace heavy charting library
- [ ] Test and validate replacements
- Expected savings: **30-50KB**

### Week 4: Advanced (6-10 hours)
- [ ] Implement virtual scrolling
- [ ] Add image lazy loading
- [ ] Implement request batching
- [ ] Performance monitoring
- Expected savings: **20-40KB**

## Monitoring Performance

### Add Performance Monitoring
```typescript
// src/lib/performance.ts
export function reportWebVitals(metric: any) {
  // Send to analytics service
  console.log(`${metric.name}: ${metric.value}ms`);
  
  // Track in your monitoring tool (e.g., Sentry)
  if (typeof window !== 'undefined' && window.__SENTRY__) {
    window.__SENTRY__.captureMessage(`${metric.name}: ${metric.value}ms`);
  }
}

// In App.tsx
import { reportWebVitals } from '@react-pdf-viewer/core';

if (typeof window !== 'undefined') {
  reportWebVitals();
}
```

### Bundle Size Tracking
```bash
# Add to CI/CD pipeline
npm run build -- --analyze

# Track over time
echo "$(date),$(du -sh dist/)" >> bundle-size-history.txt
```

## Performance Benchmarks

### Current Metrics (Baseline)
```
Initial Load Time:  ~3-4 seconds
Time to Interactive: ~5-6 seconds
Largest Contentful Paint: ~4-5 seconds
Cumulative Layout Shift: >0.1 (needs improvement)
```

### Target Metrics
```
Initial Load Time:  <2 seconds
Time to Interactive: <3 seconds
Largest Contentful Paint: <2.5 seconds
Cumulative Layout Shift: <0.1
```

## Tools & Resources

1. **Bundle Analysis:** `rollup-plugin-visualizer`
2. **Performance:** Chrome DevTools Performance tab
3. **Lighthouse:** Built into Chrome DevTools
4. **Web.dev:** Free performance analysis
5. **Bundle Phobia:** Check library sizes

## Next Steps

1. Install bundle visualizer
2. Identify largest dependencies
3. Create performance baseline
4. Implement quick wins first
5. Measure and iterate

---

**Estimated Total Improvement:** 40-50% bundle size reduction (100-150KB savings)
