import { spawn } from 'node:child_process';

const port = process.env.PLAYWRIGHT_PORT ?? '3137';

const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--port', port],
  {
    env: {
      ...process.env,
      NEXT_PUBLIC_E2E_MOCKS: '1',
    },
    stdio: 'inherit',
    windowsHide: true,
  },
);

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
