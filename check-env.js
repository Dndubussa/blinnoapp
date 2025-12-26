/**
 * Environment Variables Check Script
 * Run this to verify that environment variables are correctly set
 * Supports both VITE_ prefixed and non-prefixed variables (Vercel integration)
 */

console.log('=== Environment Variables Check ===\n');

const requiredVars = [
  { name: 'VITE_SUPABASE_URL', fallback: 'SUPABASE_URL' },
  { name: 'VITE_SUPABASE_ANON_KEY', fallback: 'SUPABASE_ANON_KEY' }
];

let allPresent = true;

requiredVars.forEach(({ name, fallback }) => {
  const value = process.env[name] || process.env[fallback];
  const usedName = process.env[name] ? name : (process.env[fallback] ? fallback : null);
  
  if (value) {
    console.log(`✅ ${usedName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${name} (or ${fallback}): NOT SET`);
    allPresent = false;
  }
});

console.log('\n=== Result ===');
if (allPresent) {
  console.log('✅ All required environment variables are set!');
} else {
  console.log('❌ Some environment variables are missing!');
  console.log('\nPlease set them in Vercel:');
  console.log('1. Go to Project Settings → Environment Variables');
  console.log('2. Add these variables for Production, Preview, and Development:');
  requiredVars.forEach(({ name, fallback }) => {
    console.log(`   - ${name} (or ${fallback} if using Vercel Supabase integration)`);
  });
  process.exit(1);
}
