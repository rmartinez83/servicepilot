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

### Send Invoice (email)

To email invoices to customers from the Invoice Detail page, set:

- **`RESEND_API_KEY`** – API key from [Resend](https://resend.com). If unset, the "Send Invoice" action still updates the invoice status to **sent** but does not send an email.
- **`RESEND_FROM_EMAIL`** (optional) – From address, e.g. `"Your Company <invoices@yourdomain.com>"`. Defaults to Resend’s onboarding sender.
- **`NEXT_PUBLIC_APP_URL`** (optional) – Base URL for the public invoice link in the email (e.g. `https://yourapp.com`). If unset, the link is derived from the request.

Public invoice view (no login): **`/invoice/[id]`**.

### Address autocomplete (customers)

On New Customer and Edit Customer, the address field can show suggestions as you type. Set **`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`** (from [Mapbox](https://www.mapbox.com/)) to enable it. If unset, the address field is a normal text input.

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
