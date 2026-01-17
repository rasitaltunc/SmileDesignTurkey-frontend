#!/usr/bin/env node
/**
 * Parse chunk modules from stats.html and enforce size budgets
 * Usage: node scripts/parse-admin-chunk.mjs
 * 
 * This script finds chunks (admin, doctor, index/main) in rollup-plugin-visualizer's stats.html
 * and enforces size budgets to prevent bundle regressions.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Try multiple possible locations for stats.html
const candidates = [
  path.join(rootDir, 'dist', 'stats.html'),
  path.join(rootDir, 'stats.html'),
  path.join(rootDir, 'dist', 'visualizer.html'),
];

const statsPath = candidates.find((p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
});

if (!statsPath) {
  console.error('❌ stats.html not found. Looked in:');
  candidates.forEach((p) => console.error(`   - ${p}`));
  console.error('\n💡 Run: npm run analyze');
  process.exit(1);
}

console.log(`✅ Found stats.html: ${path.relative(rootDir, statsPath)}\n`);

const html = fs.readFileSync(statsPath, 'utf8');

// Parse data from HTML (visualizer embeds data in a script tag)
const match = html.match(/const\s+data\s*=\s*(\{[\s\S]*?\});/);
if (!match) {
  console.error('❌ Could not find data in stats.html');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(match[1]);
} catch (e) {
  try {
    // Fallback: try Function constructor for JS object
    data = new Function('return (' + match[1] + ')')();
  } catch (e2) {
    console.error('❌ Failed to parse data:', e2.message);
    process.exit(1);
  }
}

const tree = data.tree;
const nodeParts = data.nodeParts;

if (!tree || !nodeParts) {
  console.error('❌ Invalid stats format (missing tree or nodeParts)');
  process.exit(1);
}

// Find admin chunk in tree
function findNodeByName(node, name) {
  if (!node) return null;
  if (node.name && node.name.includes(name)) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByName(child, name);
      if (found) return found;
    }
  }
  return null;
}

const adminNode = findNodeByName(tree, 'admin-');
if (!adminNode) {
  console.error('❌ Admin chunk not found in stats tree');
  process.exit(1);
}

console.log(`✅ Admin chunk: ${adminNode.name}\n`);

// Build uid -> name mapping from tree
const uidToName = new Map();
function mapTree(node) {
  if (node.uid && node.name) {
    uidToName.set(node.uid, node.name);
  }
  if (node.children) {
    node.children.forEach(mapTree);
  }
}
mapTree(adminNode);

// Collect all module UIDs from admin chunk
const moduleUids = new Set();
function collectModuleUids(node) {
  if (node.uid) moduleUids.add(node.uid);
  if (node.children) {
    node.children.forEach(collectModuleUids);
  }
}
collectModuleUids(adminNode);

// Extract module data from nodeParts
const modules = [];
for (const uid of moduleUids) {
  const part = nodeParts[uid];
  if (part && (part.gzipLength || part.renderedLength)) {
    const name = uidToName.get(uid) || part.id || uid;
    modules.push({
      id: name,
      gzipLength: part.gzipLength || 0,
      renderedLength: part.renderedLength || 0,
    });
  }
}

modules.sort((a, b) => b.gzipLength - a.gzipLength);

// Check for public pages (should not be in admin chunk)
const publicPages = ['Onboarding', 'Navbar', 'Home', 'Pricing', 'Contact', 'Process', 'Reviews', 'PlanDashboard'];
const foundPublic = modules.filter((m) => publicPages.some((pp) => m.id.includes(pp)));

const totalGzip = modules.reduce((sum, m) => sum + m.gzipLength, 0) / 1024;
const totalRaw = modules.reduce((sum, m) => sum + m.renderedLength, 0) / 1024;

// Output results
console.log('📊 Admin Chunk Statistics:');
console.log(`   Total modules: ${modules.length}`);
console.log(`   Total size: ${totalRaw.toFixed(2)} KB raw / ${totalGzip.toFixed(2)} KB gzip`);
console.log(`   Public pages found: ${foundPublic.length > 0 ? '⚠️  YES' : '✅ NO'}\n`);

if (foundPublic.length > 0) {
  console.log('⚠️  Public pages in admin chunk:');
  foundPublic.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.id} (${(m.gzipLength / 1024).toFixed(2)} KB gzip)`);
  });
  console.log('');
  console.error('❌ Regression detected: Public pages should not be in admin chunk!');
  process.exit(1); // CI-friendly: fail on regression
}

console.log('✅ TOP 15 MODULES (by gzip):\n');
modules.slice(0, 15).forEach((m, i) => {
  const gzip = m.gzipLength / 1024;
  const raw = m.renderedLength / 1024;
  console.log(`${String(i + 1).padStart(2, '0')}. ${gzip.toFixed(2)} KB gzip (${raw.toFixed(2)} KB raw) | ${m.id}`);
});

// --- Regression thresholds (CI guard) ---
// Use REAL asset file gzip size, not visualizer's module total (more accurate)
const MAX_ADMIN_GZIP_KB = Number(process.env.MAX_ADMIN_GZIP_KB || 35);
const MAX_DOCTOR_GZIP_KB = Number(process.env.MAX_DOCTOR_GZIP_KB || 40);
const MAX_INDEX_GZIP_KB = Number(process.env.MAX_INDEX_GZIP_KB || 180);

// Generic function to get real asset gzip size for any chunk prefix
function tryGetRealAssetGzipKB(chunkPrefix) {
  const assetsDir = path.join(rootDir, 'dist', 'assets');
  if (!fs.existsSync(assetsDir)) return null;

  try {
    const files = fs.readdirSync(assetsDir);
    // Find all files matching prefix (e.g., admin-*.js, doctor-*.js, index-*.js)
    const chunkFiles = files.filter((f) => f.startsWith(chunkPrefix) && f.endsWith('.js'));
    if (chunkFiles.length === 0) return null;

    // If multiple, use the largest one (shouldn't happen, but safe fallback)
    let largestFile = null;
    let largestSize = 0;
    for (const file of chunkFiles) {
      const filePath = path.join(assetsDir, file);
      const stats = fs.statSync(filePath);
      if (stats.size > largestSize) {
        largestSize = stats.size;
        largestFile = filePath;
      }
    }

    if (!largestFile) return null;

    const fileContent = fs.readFileSync(largestFile);
    const gzipped = gzipSync(fileContent);
    return {
      path: path.basename(largestFile),
      gzipKb: gzipped.length / 1024,
    };
  } catch (e) {
    return null;
  }
}

// Check admin chunk
const adminAsset = tryGetRealAssetGzipKB('admin-');
const adminGzipToCheck = adminAsset ? adminAsset.gzipKb : totalGzip;

if (adminAsset) {
  console.log(`\n📦 Admin gzip (checked): ${adminGzipToCheck.toFixed(2)} KB (real asset: ${adminAsset.path})`);
} else {
  console.log(`\n📦 Admin gzip (checked): ${adminGzipToCheck.toFixed(2)} KB (module total fallback)`);
}

if (adminGzipToCheck > MAX_ADMIN_GZIP_KB) {
  console.error('');
  console.error(`❌ Regression detected: Admin chunk gzip too large (${adminGzipToCheck.toFixed(2)} KB > ${MAX_ADMIN_GZIP_KB} KB)`);
  console.error(`   Threshold: ${MAX_ADMIN_GZIP_KB} KB gzip (override with MAX_ADMIN_GZIP_KB env var)`);
  if (adminAsset) {
    console.error(`   Asset file: ${adminAsset.path}`);
  }
  process.exit(1);
}

console.log(`\n✅ Admin size check passed (${adminGzipToCheck.toFixed(2)} KB ≤ ${MAX_ADMIN_GZIP_KB} KB threshold)`);

// Check doctor chunk (if exists)
const doctorNode = findNodeByName(tree, 'doctor-');
if (doctorNode) {
  console.log(`\n✅ Doctor chunk found: ${doctorNode.name}`);
  
  // Map doctor chunk tree for uid -> name mapping
  mapTree(doctorNode);
  
  // Collect doctor modules (similar to admin)
  const doctorModuleUids = new Set();
  function collectDoctorModuleUids(node) {
    if (node.uid) doctorModuleUids.add(node.uid);
    if (node.children) {
      node.children.forEach(collectDoctorModuleUids);
    }
  }
  collectDoctorModuleUids(doctorNode);
  
  const doctorModules = [];
  for (const uid of doctorModuleUids) {
    const part = nodeParts[uid];
    if (part && (part.gzipLength || part.renderedLength)) {
      const name = uidToName.get(uid) || part.id || uid;
      doctorModules.push({
        id: name,
        gzipLength: part.gzipLength || 0,
        renderedLength: part.renderedLength || 0,
      });
    }
  }
  
  const doctorTotalGzip = doctorModules.reduce((sum, m) => sum + m.gzipLength, 0) / 1024;
  
  const doctorAsset = tryGetRealAssetGzipKB('doctor-');
  const doctorGzipToCheck = doctorAsset ? doctorAsset.gzipKb : doctorTotalGzip;
  
  if (doctorAsset) {
    console.log(`📦 Doctor gzip (checked): ${doctorGzipToCheck.toFixed(2)} KB (real asset: ${doctorAsset.path})`);
  } else {
    console.log(`📦 Doctor gzip (checked): ${doctorGzipToCheck.toFixed(2)} KB (module total fallback)`);
  }
  
  if (doctorGzipToCheck > MAX_DOCTOR_GZIP_KB) {
    console.error('');
    console.error(`❌ Regression detected: Doctor chunk gzip too large (${doctorGzipToCheck.toFixed(2)} KB > ${MAX_DOCTOR_GZIP_KB} KB)`);
    console.error(`   Threshold: ${MAX_DOCTOR_GZIP_KB} KB gzip (override with MAX_DOCTOR_GZIP_KB env var)`);
    if (doctorAsset) {
      console.error(`   Asset file: ${doctorAsset.path}`);
    }
    process.exit(1);
  }
  
  console.log(`✅ Doctor size check passed (${doctorGzipToCheck.toFixed(2)} KB ≤ ${MAX_DOCTOR_GZIP_KB} KB threshold)`);
} else {
  console.log(`\n⚠️  Doctor chunk not found (skipping doctor check)`);
}

// Check index/main entry chunk (public initial bundle)
const indexAsset = tryGetRealAssetGzipKB('index-');
if (indexAsset) {
  console.log(`\n📦 Index/main entry gzip: ${indexAsset.gzipKb.toFixed(2)} KB (real asset: ${indexAsset.path})`);
  
  if (indexAsset.gzipKb > MAX_INDEX_GZIP_KB) {
    console.error('');
    console.error(`❌ Regression detected: Index/main entry gzip too large (${indexAsset.gzipKb.toFixed(2)} KB > ${MAX_INDEX_GZIP_KB} KB)`);
    console.error(`   Threshold: ${MAX_INDEX_GZIP_KB} KB gzip (override with MAX_INDEX_GZIP_KB env var)`);
    console.error(`   Asset file: ${indexAsset.path}`);
    process.exit(1);
  }
  
  console.log(`✅ Index/main size check passed (${indexAsset.gzipKb.toFixed(2)} KB ≤ ${MAX_INDEX_GZIP_KB} KB threshold)`);
} else {
  console.log(`\n⚠️  Index/main entry chunk not found (skipping index check)`);
}

console.log('\n✅ All chunk size checks passed.\n');

