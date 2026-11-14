// Minimal types for the two Node APIs the tests use (avoids adding @types/node; tests run in Node via Vitest).
interface ImportMeta {
  readonly url: string;
}
declare module 'node:fs' {
  export function readFileSync(path: URL): { buffer: ArrayBuffer; byteOffset: number; byteLength: number };
  export function readFileSync(path: URL, encoding: 'utf8'): string;
  export function writeFileSync(path: URL, data: string): void;
  export function mkdirSync(path: URL, options?: { recursive?: boolean }): void;
}
declare var console: { log(...args: unknown[]): void };
declare class URL {
  constructor(url: string, base?: string | URL);
  readonly href: string;
}
