const fs = require('fs');
let code = fs.readFileSync('api.js', 'utf8');

const target = `      const isTestEnv = (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || Boolean(process.env?.NODE_TEST_CONTEXT))) ||
                        (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('jsdom'));`;

const replacement = `      const isTestEnv = Boolean(typeof globalThis !== 'undefined' && globalThis.process?.env && (globalThis.process.env.NODE_ENV === 'test' || globalThis.process.env.NODE_TEST_CONTEXT)) ||
                        Boolean(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('jsdom'));`;

if (!code.includes(target)) {
  console.error('Target not found');
  process.exit(1);
}

code = code.replace(target, replacement);
fs.writeFileSync('api.js', code, 'utf8');
console.log('Fixed process reference for eslint');
