import nodemailer, { type Transporter } from "nodemailer";

type EmailResult = {
  sent: boolean;
  messageId?: string;
  error?: string;
};

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  return cachedTransporter;
}

async function safeSendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM;

  if (!transporter || !from) {
    return {
      sent: false,
      error: "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM."
    };
  }

  try {
    const response = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo
    });

    return {
      sent: true,
      messageId: response.messageId
    };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Unknown email error"
    };
  }
}

export async function sendPlagiarismAlert(params: {
  to: string;
  contentTitle: string;
  dashboardUrl: string;
  findings: Array<{ infringingUrl: string; confidence: number }>;
}): Promise<EmailResult> {
  const findingsText = params.findings
    .map((finding) => `- ${finding.infringingUrl} (${Math.round(finding.confidence * 100)}% similarity)`)
    .join("\n");

  return safeSendMail({
    to: params.to,
    subject: `Plagiarism detected for \"${params.contentTitle}\"`,
    text: [
      `We detected new potential unauthorized republishes for: ${params.contentTitle}`,
      "",
      findingsText,
      "",
      `Review and send DMCA notices: ${params.dashboardUrl}`
    ].join("\n")
  });
}

export async function sendDmcaNoticeEmail(params: {
  to: string;
  complainantEmail: string;
  noticeText: string;
}): Promise<EmailResult> {
  return safeSendMail({
    to: params.to,
    replyTo: params.complainantEmail,
    subject: "DMCA Takedown Notice",
    text: params.noticeText
  });
}
