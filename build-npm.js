#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🏗️  Building Qwen Swarm for npm distribution...');

// Clean previous build
if (existsSync('./dist')) {
  rmSync('./dist', { recursive: true, force: true });
}

// Create dist directory
mkdirSync('./dist', { recursive: true });

// Copy source files to dist
function copyRecursive(src, dest) {
  const exists = existsSync(src);
  const stats = exists && statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    mkdirSync(dest, { recursive: true });
    readdirSync(src).forEach(childItemName => {
      copyRecursive(join(src, childItemName), join(dest, childItemName));
    });
  } else {
    copyFileSync(src, dest);
  }
}

// Copy all source files
console.log('📁 Copying source files...');
copyRecursive('./src', './dist/src');
copyRecursive('./config', './dist/config');
copyRecursive('./agents', './dist/agents');
copyRecursive('./docs', './dist/docs');
copyRecursive('./scripts', './dist/scripts');

// Copy root files
const rootFiles = ['README.md', 'LICENSE', 'CHANGELOG_v2.0.0.md', '.env.example'];
rootFiles.forEach(file => {
  if (existsSync(`./${file}`)) {
    copyFileSync(`./${file}`, `./dist/${file}`);
  }
});

// Create package.json for npm
const npmPackage = {
  name: 'qwen-swarm',
  version: '2.1.0',
  description: '🧠 Advanced multi-agent orchestration platform with unified CLI interface - just run qwen-swarm to get started',
  main: 'dist/src/index.js',
  bin: {
    'qwen-swarm': 'dist/src/cli/unified-cli.js'
  },
  type: 'module',
  scripts: {
    start: 'node dist/src/index.js',
    dev: 'node dist/src/index.js --dev',
    postinstall: 'node dist/src/scripts/postinstall.js'
  },
  dependencies: {
    "@types/node": "^20.0.0",
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "uuid": "^9.0.1",
    "zod": "^3.22.4",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1",
    "eventemitter3": "^5.0.1",
    "node-cron": "^3.0.3",
    "commander": "^11.1.0",
    "chokidar": "^3.5.3",
    "chalk": "^5.3.0",
    "inquirer": "^9.2.12",
    "ora": "^7.0.1",
    "open": "^9.1.0",
    "glob": "^10.3.10",
    "axios": "^1.6.2",
    "js-yaml": "^4.1.0",
    "simple-git": "^3.20.0",
    "semver": "^7.5.4",
    "node-cache": "^5.1.2",
    "tsx": "^4.6.2"
  },
  engines: {
    "node": ">=18.0.0"
  },
  keywords: [
    "swarm-intelligence",
    "multi-agent",
    "ai-orchestration",
    "qwen-code",
    "self-improving",
    "self-healing",
    "typescript",
    "cli",
    "terminal",
    "web-ui",
    "unified-interface"
  ],
  author: {
    "name": "9pros",
    "email": "max@9pros.com"
  },
  license": "MIT",
  repository: {
    "type": "git",
    "url": "https://github.com/9pros/qwen-swarm.git"
  },
  bugs: {
    "url": "https://github.com/9pros/qwen-swarm/issues"
  },
  homepage: "https://github.com/9pros/qwen-swarm#readme",
  files: [
    "dist/**/*"
  ],
  publishConfig: {
    "access": "public"
  }
};

// Write package.json to dist
const fs = await import('fs');
fs.writeFileSync('./dist/package.json', JSON.stringify(npmPackage, null, 2));

// Create shebang for unified-cli.js
const unifiedCliPath = './dist/src/cli/unified-cli.js';
if (existsSync(unifiedCliPath)) {
  let content = fs.readFileSync(unifiedCliPath, 'utf8');
  if (!content.startsWith('#!/usr/bin/env node')) {
    content = '#!/usr/bin/env node\n' + content;
    fs.writeFileSync(unifiedCliPath, content);
  }
  // Make it executable
  try {
    execSync('chmod +x ./dist/src/cli/unified-cli.js');
  } catch (e) {
    // Windows doesn't support chmod
  }
}

console.log('✅ Build completed successfully!');
console.log('📦 Ready to publish with: npm publish ./dist');