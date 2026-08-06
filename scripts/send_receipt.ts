import { sendReceipt } from "../src/receipt_sender.ts";

const [playerEmail, orderId, itemName, amount] = process.argv.slice(2);

if (!playerEmail || !orderId || !itemName || !amount) {
  console.error(
    "Usage: npm run receipt -- <email> <order-id> <item-name> <amount-cents>",
  );
  process.exit(1);
}

const amountCents = Number.parseInt(amount, 10);
if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
  throw new Error("amount-cents must be a non-negative integer");
}

const result = await sendReceipt({
  orderId,
  playerEmail,
  itemName,
  amountCents,
  currency: "USD",
});

console.log(`receipt queued: ${result.message_id}`);
