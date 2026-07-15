import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const envPath = path.resolve('.env');

if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found in the current directory!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split(/\r?\n/);

console.log('Starting environment variables push to Vercel...');

for (const line of lines) {
  const trimmed = line.trim();
  // Skip comments and empty lines
  if (!trimmed || trimmed.startsWith('#')) continue;

  const delimiterIndex = trimmed.indexOf('=');
  if (delimiterIndex === -1) continue;

  const key = trimmed.substring(0, delimiterIndex).trim();
  let val = trimmed.substring(delimiterIndex + 1).trim();

  // Strip surrounding quotes if present
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }

  console.log(`\n--- Processing: ${key} ---`);
  
  // Remove existing environment variable if it exists to prevent duplicate/collision errors
  try {
    execSync(`npx vercel env rm ${key} -y`, { stdio: 'ignore' });
  } catch (e) {
    // Ignore error if variable doesn't exist
  }

  // Add the variable to production, preview, and development environments
  try {
    // Execute command with value enclosed in quotes for the CLI shell
    execSync(`npx vercel env add ${key} production "${val}"`, { stdio: 'inherit' });
    execSync(`npx vercel env add ${key} preview "${val}"`, { stdio: 'inherit' });
    execSync(`npx vercel env add ${key} development "${val}"`, { stdio: 'inherit' });
    console.log(`✅ ${key} pushed successfully to all environments.`);
  } catch (error) {
    console.error(`❌ Failed to push ${key}:`, error.message);
  }
}

console.log('\nDone! Please run a redeploy (e.g., npx vercel --prod) to apply the new environment variables.');
