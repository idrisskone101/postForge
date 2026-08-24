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

## Storage

Generated media defaults to database-backed storage (`STORAGE_DRIVER="database"`), so gallery items, avatars, TikTok source clips, and UGC clone outputs persist with Postgres instead of depending on a local output folder. Legacy files already stored on disk are backfilled into Postgres automatically on server boot.

## Kode setup

Kode setup is centralized in `scripts/kode-setup.sh`. It copies local env files from the foreground checkout when available, installs with pnpm, generates the Prisma client, and applies existing migrations when Postgres is reachable.

Use these commands in environment settings:

```bash
bash scripts/kode-setup.sh
```

Use these actions:

```bash
pnpm dev
pnpm kode:check
pnpm exec prisma migrate status
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
