import { createHash } from "node:crypto";
import { infrai, type SendEmailResult } from "./infrai.ts";

export type GameOrder = {
  orderId: string;
  playerEmail: string;
  itemName: string;
  amountCents: number;
  currency: string;
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] as string,
  );
}

function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function receiptKey(orderId: string): string {
  const digest = createHash("sha256").update(orderId).digest("hex").slice(0, 24);
  return `game-receipt-${digest}`;
}

export function sendReceipt(order: GameOrder): Promise<SendEmailResult> {
  const orderId = escapeHtml(order.orderId);
  const itemName = escapeHtml(order.itemName);
  const amount = formatAmount(order.amountCents, order.currency);

  return infrai.email.send(
    {
      to: order.playerEmail,
      subject: `Receipt for game order ${order.orderId}`,
      html: [
        "<h1>Order confirmed</h1>",
        `<p>Order <strong>${orderId}</strong> is complete.</p>`,
        `<p>${itemName}: <strong>${amount}</strong></p>`,
        "<p>Keep this email for your records.</p>",
      ].join(""),
    },
    receiptKey(order.orderId),
  );
}
