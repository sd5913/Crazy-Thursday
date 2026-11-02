import { cp } from 'node:fs/promises';
// Copy src/ over www/ in place. We intentionally do NOT delete www/ first:
// the environment's safe-delete shim blocks fs.rm on generated dirs, and a
// plain recursive copy already overwrites changed files and adds new ones.
await cp('src', 'www', { recursive: true });
console.log('Built www/ from src/');
