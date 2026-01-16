#!/usr/bin/env node
/**
 * Parse admin chunk modules from stats.html
 * Usage: node scripts/parse-admin-chunk.mjs
 * 
 * This script finds the admin chunk in rollup-plugin-visualizer's stats.html
 * and lists the top modules by gzip size.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

console.log('\n✅ Analysis complete.\n');

