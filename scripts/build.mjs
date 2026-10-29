import { cp, mkdir, rm } from 'node:fs/promises';
await rm('www', { recursive: true, force: true });
await mkdir('www', { recursive: true });
await cp('src', 'www', { recursive: true });
