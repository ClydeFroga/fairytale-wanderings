import nodemailer, { type Transporter } from "nodemailer";

export type MailMessage = {
  subject: string;
  text: string;
  html: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
};

function readConfig(): SmtpConfig | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO } = process.env;

  // Без полной конфигурации почту не шлём (например, в тестах) — просто пропускаем.
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_TO) {
    return null;
  }

  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE !== "false", // по умолчанию TLS (465)
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: process.env.MAIL_FROM || SMTP_USER,
    to: MAIL_TO,
  };
}

let cached: { config: SmtpConfig; transporter: Transporter } | null = null;

function getTransport() {
  if (cached) return cached;

  const config = readConfig();
  if (!config) return null;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  cached = { config, transporter };
  return cached;
}

/**
 * Отправляет письмо владелице магазина. Если SMTP не настроен — тихо пропускает
 * (с предупреждением в лог), чтобы отсутствие почты не ломало оформление заказа.
 */
export async function sendOwnerMail(message: MailMessage): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    console.warn("SMTP не настроен — письмо о заказе не отправлено");
    return;
  }

  await transport.transporter.sendMail({
    from: transport.config.from,
    to: transport.config.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
