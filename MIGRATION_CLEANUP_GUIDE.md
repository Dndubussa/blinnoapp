# Database Migration Cleanup Guide

## Current State
- **Total Migrations:** 32
- **Named Migrations:** 12 (clear purpose)
- **UUID Migrations:** 20 (unclear, likely test/dev)

## Migration Organization

### ✅ KEEP: Core Functionality Migrations (12)
```
20250115000000_fix_get_seller_balance.sql
  Purpose: Add/fix get_seller_balance() function
  Priority: HIGH

20250115000002_ensure_products_visible_to_all.sql
  Purpose: Ensure products are visible to all users
  Priority: HIGH

20250115000004_add_seller_types.sql
  Purpose: Add seller type classification
  Priority: HIGH

20250115000005_add_onboarding_version.sql
  Purpose: Track onboarding version for sellers
  Priority: MEDIUM

20250120000001_restrict_public_profile_access.sql
  Purpose: Security fix - restrict profile visibility
  Priority: CRITICAL

20250120000002_add_input_length_limits.sql
  Purpose: Security/validation - add database constraints
  Priority: HIGH

20250120000003_add_subscription_id_to_payments.sql
  Purpose: Link payments to subscriptions
  Priority: MEDIUM

20250120000004_add_seller_location_fields.sql
  Purpose: Add location data for sellers
  Priority: MEDIUM

20250122000001_update_product_prices.sql
  Purpose: Fix unrealistic test prices
  Priority: MEDIUM

20250123000002_normalize_prices_to_usd.sql
  Purpose: Currency normalization
  Priority: MEDIUM

20251225000001_add_get_seller_commission_rate_function.sql
  Purpose: Calculate seller commissions
  Priority: HIGH

20251226000001_add_currency_to_products.sql & 20251226000002_add_currency_preference_to_profiles.sql
  Purpose: Multi-currency support
  Priority: HIGH
```

### ⚠️ REVIEW/CONSOLIDATE: UUID Migrations (20)
These migrations appear to be development/testing versions. They should be reviewed and consolidated:

```
20251207115326... (7 migrations)
20251207120409...
20251207120523...
20251207122903...
20251207123320...
20251207124044...
20251207125026...
20251207131330...
20251207131720...
20251207201757...
20251208005005...
20251208005457...
20251208051048...
20251209084946...
20251209104942...
20251210081803...
20251210083832...
20251211042045_create_product_images_bucket.sql (KEEP - public images bucket)
20251213193721_create_product_images_bucket.sql (DUPLICATE - REMOVE)
```

## Action Items

### Immediate (Next 2 Weeks)
1. **Document UUID migrations**
   - Create a MIGRATION_MANIFEST.md file
   - Record purpose of each UUID migration
   - Identify which ones can be consolidated

2. **Remove duplicates**
   - Check for duplicate bucket creation migrations
   - Remove test/temporary migrations

3. **Update migration naming**
   - Rename UUID migrations to semantic names:
     ```
     20251207115326_add_user_roles_and_profiles.sql
     20251207120409_configure_rls_policies.sql
     etc.
     ```

### Short Term (Month 1)
1. Consolidate RLS policy migrations
2. Create single comprehensive schema migration
3. Document migration dependencies

### Long Term (Ongoing)
1. Add migration validation tests
2. Implement CI/CD checks for migration quality
3. Create migration review checklist for PRs

## Current Migration Issues

### Issues Found
1. **Unclear purposes** - UUID-named migrations lack context
2. **Potential duplicates** - product-images bucket appears twice
3. **Test data migrations** - Several migrations modify test data
4. **RLS chaos** - Policies defined across multiple migrations
5. **No rollback procedures** - Down migrations not documented

## Recommended Structure

```
supabase/migrations/
├── 001_init_schema.sql          (Tables, enums, functions)
├── 002_init_rls_policies.sql    (All RLS policies)
├── 003_init_storage.sql         (Storage buckets)
├── 004_fix_bugs.sql             (Bug fixes from testing)
├── 005_add_features.sql         (New feature columns)
└── MIGRATION_MANIFEST.md        (Documentation)
```

## Testing Migrations

Before applying any migrations:
```sql
-- Test on fresh database
1. Create backup
2. Run migration
3. Verify data integrity
4. Check RLS policies
5. Test application functionality
```

## Next Steps

1. ✅ Review all 32 migrations
2. ⏳ Create consolidated schema migration
3. ⏳ Document purposes of all migrations
4. ⏳ Remove test/temporary migrations
5. ⏳ Update git history (optional, use caution)
