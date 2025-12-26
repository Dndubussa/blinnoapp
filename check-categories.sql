-- Check all unique category values in products table
SELECT DISTINCT 
  category,
  COUNT(*) as product_count,
  CASE 
    WHEN category = 'Books' THEN '✅ Matches navbar (books)'
    WHEN category = 'Products' THEN '✅ Matches navbar (products)'
    WHEN category = 'Creators' THEN '✅ Matches navbar (creators)'
    WHEN category = 'Courses' THEN '✅ Matches navbar (courses)'
    WHEN category = 'Services' THEN '✅ Matches navbar (services)'
    WHEN category = 'Events' THEN '✅ Matches navbar (events)'
    ELSE '⚠️ Unknown category'
  END as navbar_match
FROM products
WHERE is_active = true
GROUP BY category
ORDER BY category;

-- Show navbar expected categories
SELECT '📋 Expected navbar categories:' as info;
SELECT 'Products, Books, Creators, Courses, Services, Events' as expected_categories;
