#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Moccet Chat Demo Setup\n');

const checks = [
  {
    name: 'Node.js version',
    check: () => {
      const version = process.version;
      const major = parseInt(version.split('.')[0].substring(1));
      return {
        pass: major >= 14,
        message: `Node.js ${version} (${major >= 14 ? '✓' : 'needs >= 14.x'})`
      };
    }
  },
  {
    name: '.env.local file',
    check: () => {
      const exists = fs.existsSync('.env.local');
      return {
        pass: exists,
        message: exists ? 'Found' : 'Missing - copy from .env.local.example'
      };
    }
  },
  {
    name: 'REACT_APP_USE_FIREBASE_EMULATOR',
    check: () => {
      if (!fs.existsSync('.env.local')) return { pass: false, message: 'No .env.local file' };
      const content = fs.readFileSync('.env.local', 'utf8');
      const hasEmulator = content.includes('REACT_APP_USE_FIREBASE_EMULATOR=true');
      return {
        pass: hasEmulator,
        message: hasEmulator ? 'Set to true' : 'Not set or false'
      };
    }
  },
  {
    name: 'Claude API Key',
    check: () => {
      if (!fs.existsSync('.env.local')) return { pass: false, message: 'No .env.local file' };
      const content = fs.readFileSync('.env.local', 'utf8');
      const hasKey = content.includes('CLAUDE_API_KEY=') && !content.includes('CLAUDE_API_KEY=your-api-key');
      return {
        pass: hasKey,
        message: hasKey ? 'Configured' : 'Missing or placeholder'
      };
    }
  },
  {
    name: 'Firebase project ID',
    check: () => {
      if (!fs.existsSync('.env.local')) return { pass: false, message: 'No .env.local file' };
      const content = fs.readFileSync('.env.local', 'utf8');
      const hasProjectId = content.includes('REACT_APP_FIREBASE_PROJECT_ID=moccet-slack');
      return {
        pass: hasProjectId,
        message: hasProjectId ? 'moccet-slack' : 'Not configured'
      };
    }
  },
  {
    name: 'API .env file',
    check: () => {
      const exists = fs.existsSync('api/.env');
      return {
        pass: exists,
        message: exists ? 'Found' : 'Missing - will be created automatically'
      };
    }
  },
  {
    name: 'Node modules installed',
    check: () => {
      const rootModules = fs.existsSync('node_modules');
      const apiModules = fs.existsSync('api/node_modules');
      return {
        pass: rootModules && apiModules,
        message: `Root: ${rootModules ? '✓' : '✗'}, API: ${apiModules ? '✓' : '✗'}`
      };
    }
  }
];

let allPassed = true;

checks.forEach(({ name, check }) => {
  const { pass, message } = check();
  console.log(`${pass ? '✅' : '❌'} ${name}: ${message}`);
  if (!pass) allPassed = false;
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ All checks passed! You can run: ./run-local.sh');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  console.log('\nQuick fixes:');
  console.log('1. Copy .env.local.example to .env.local');
  console.log('2. Make sure REACT_APP_USE_FIREBASE_EMULATOR=true in .env.local');
  console.log('3. Add your Claude API key to .env.local');
  console.log('4. Run: npm install && cd api && npm install');
}

process.exit(allPassed ? 0 : 1);