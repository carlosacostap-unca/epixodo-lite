This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## OpenSpec

This project includes OpenSpec for spec-driven changes. OpenSpec artifacts live in `openspec/`, and Codex skills live in `.codex/skills/`.

Useful commands:

```bash
npm run openspec -- list
npm run openspec:validate
```

In Codex, restart the app if needed so the generated slash commands are available, then start a change with:

```text
/opsx:propose "describe the change"
```

## Playwright

End-to-end tests live in `tests/e2e/`. Install browsers with `npm run test:e2e:install`, then run the suite with `npm run test:e2e`.

The E2E server runs with mutable local fixtures from `lib/e2eFixtures.ts` instead of calling PocketBase, so browser tests are stable without external data or network access. Each test resets the in-memory fixture store through the internal `/api/e2e` route.

## Voice dictation

Voice task capture uses the OpenAI Audio Transcriptions API from a Next.js route handler with `gpt-4o-mini-transcribe-2025-12-15`. Set `OPENAI_API_KEY` in the server environment before using dictation outside E2E tests.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
