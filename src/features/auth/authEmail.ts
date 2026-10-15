import nodemailer from "nodemailer";
import { site } from "@/content/site";

/**
 * Sign-in code email over SMTP. Used when AUTH_CODE_WEBHOOK_URL is unset.
 * Configure with SMTP_HOST, SMTP_PORT (465 implicit TLS, 587 STARTTLS),
 * SMTP_USER, SMTP_PASS and AUTH_EMAIL_FROM ("Name <address>").
 */

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

/** Read at call time so a pm2 reload picks up .env changes. */
export function smtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  if (!host || !user || !pass || !from) return null;

  const port = Number.parseInt(process.env.SMTP_PORT?.trim() || "465", 10);
  return { host, port, secure: port === 465, user, pass, from };
}

export function renderSignInEmail(code: string): {
  subject: string;
  text: string;
  html: string;
} {
  const text = [
    "Welcome back to The Artist Post.",
    "",
    `Your sign-in code is ${code}`,
    "",
    "It works for 10 minutes. If you didn't ask for it, you can ignore this email.",
    "",
    "Kindness Always — Be Kind, Shine Bright!",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#071A2E;font-family:Helvetica,Arial,sans-serif;color:#F5F1E8">
  <p style="margin:0 0 16px;font-size:16px">Welcome back to The Artist Post.</p>
  <p style="margin:0 0 8px;font-size:14px">Your sign-in code is</p>
  <p style="margin:0 0 16px;font-size:32px;letter-spacing:6px;font-weight:bold">${code}</p>
  <p style="margin:0 0 16px;font-size:14px">It works for 10 minutes. If you didn't ask for it, you can ignore this email.</p>
  <p style="margin:0;font-size:12px;opacity:.7">Kindness Always — Be Kind, Shine Bright!</p>
</body></html>`;

  return { subject: "Your Artist Post sign-in code", text, html };
}

export async function sendSignInCodeEmail(
  config: SmtpConfig,
  to: string,
  code: string,
): Promise<{ delivered: boolean; error?: string }> {
  const message = renderSignInEmail(code);
  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    // Replies go to The Artist Post itself (the sending subdomain has no inbox).
    const replyTo = process.env.AUTH_EMAIL_REPLY_TO?.trim() || site.email;
    await transport.sendMail({ from: config.from, to, replyTo, ...message });
    return { delivered: true };
  } catch (error) {
    // Never log the message body: it carries the code.
    console.error(
      "[auth/email] SMTP delivery failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return { delivered: false, error: "Code delivery failed." };
  }
}
