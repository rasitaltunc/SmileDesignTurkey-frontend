#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const projectRoot = join(__dirname, '..');
const evidenceJsonPath = join(projectRoot, 'src', 'content', 'evidence.json');
const publicEvidencePath = join(projectRoot, 'public', 'evidence');

// Read evidence.json
let evidenceConfig;
try {
  const evidenceContent = readFileSync(evidenceJsonPath, 'utf-8');
  evidenceConfig = JSON.parse(evidenceContent);
} catch (error) {
  console.error('❌ Failed to read evidence.json:', error.message);
  process.exit(1);
}

// Check for missing files
const missingFiles = [];
const checkedFiles = new Set();

function checkFile(url) {
  // Skip placeholder URLs and external links
  if (url === '#' || url.startsWith('http://') || url.startsWith('https://')) {
    return;
  }

  // Skip placeholder.svg (it's the default placeholder, always allowed)
  if (url.includes('placeholder.svg')) {
    return;
  }

  // Skip other placeholder files (they're allowed to exist or not)
  if (url.includes('placeholder')) {
    return;
  }

  // Skip if already checked
  if (checkedFiles.has(url)) {
    return;
  }
  checkedFiles.add(url);

  // Only check files in /evidence/ directory
  if (url.startsWith('/evidence/')) {
    const filePath = join(projectRoot, 'public', url);
    if (!existsSync(filePath)) {
      missingFiles.push({
        url,
        filePath: filePath.replace(projectRoot, ''),
      });
    }
  }
}

// Check all items in all sections
evidenceConfig.sections.forEach((section) => {
  section.items.forEach((item) => {
    checkFile(item.url);
  });
});

// Report results
if (missingFiles.length === 0) {
  console.log('✅ All evidence files exist');
  process.exit(0);
} else {
  console.error('❌ Missing evidence files:');
  missingFiles.forEach(({ url, filePath }) => {
    console.error(`   - ${url} (expected at: ${filePath})`);
  });
  console.error(`\n💡 Tip: Place files in public/evidence/ or update evidence.json to use placeholder URLs`);
  process.exit(1);
}

