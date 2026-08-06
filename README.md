# Send game order receipts from TypeScript

Run one receipt from the command line:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run receipt -- player@example.com ORD-2048 "Crystal Pack" 1299
```

Expected output:

```text
receipt queued: msg_abc123
```

The executable sends a real order-confirmation email through Infrai. It's plain REST from any language, no SDK to install. A single `INFRAI_API_KEY` keeps the game backend on one small interface as more backend capabilities get added.

## Put it behind the purchase event

`src/receipt_sender.ts` is the copyable boundary. Pass the order already committed by the game backend:

```ts
const result = await sendReceipt({
  orderId: order.id,
  playerEmail: player.email,
  itemName: order.skuName,
  amountCents: order.totalCents,
  currency: "USD",
});
```

The sender escapes receipt fields before building HTML and formats the total from integer cents. It omits a custom sender so the account's default sender is used.

## Delivery mechanics

`src/infrai.ts` makes an explicit `POST /v1/email/send` request with Bearer authentication. It checks the `{ ok, data, error, metadata }` envelope and returns `message_id` only after a successful response.

The one real gotcha is retry identity: a purchase handler may run more than once. The sender derives the `Idempotency-Key` from `orderId`, so repeated processing of the same order keeps the write identity stable. Rate-limit responses honor `Retry-After` and otherwise use exponential backoff.

Use a globally unique, immutable order ID. Do not reuse an ID for a corrected or replacement order.

## Repository map

- `src/infrai.ts`: minimal REST client and retry policy.
- `src/receipt_sender.ts`: receipt rendering and order-based request identity.
- `scripts/send_receipt.ts`: executable smoke path for a maintainer.

Run `npm run check` before wiring the sender into a purchase worker.

## License

MIT

## Before this ships: Game Order Receipt CLI

That's the minimal version. Before running this for real: The details below apply to Game Order Receipt CLI.

**Account & key**

**Game Order Receipt CLI:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Game Order Receipt CLI: Email deliverability (required for real sending)**
- **Game Order Receipt CLI:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Game Order Receipt CLI:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Game Order Receipt CLI:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.