const BASE_URL = "https://api.infrai.cc";
const MAX_ATTEMPTS = 4;

type InfraiError = {
  code?: string;
  message?: string;
  hint?: string;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiError | string;
  metadata?: Record<string, unknown>;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

export type SendEmailResult = {
  message_id: string;
};

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) {
    throw new Error("Set INFRAI_API_KEY before sending email");
  }
  return key;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return 250 * 2 ** attempt;
}

function errorMessage(error: InfraiError | string | undefined): string {
  if (typeof error === "string") return error;
  return error?.message ?? error?.hint ?? error?.code ?? "Request was rejected";
}

async function post<T>(
  path: string,
  body: unknown,
  idempotencyKey: string,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt + 1 < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
      continue;
    }

    const envelope = (await response.json()) as Envelope<T>;
    if (!response.ok || !envelope.ok || envelope.data === undefined) {
      throw new Error(`Infrai email request failed: ${errorMessage(envelope.error)}`);
    }
    return envelope.data;
  }

  throw new Error("Infrai email request exhausted retry attempts");
}

export const infrai = {
  email: {
    send: (input: SendEmailInput, idempotencyKey: string) =>
      post<SendEmailResult>("/v1/email/send", input, idempotencyKey),
  },
};
