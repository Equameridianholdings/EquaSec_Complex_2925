import nodemailer from "nodemailer";

type SendCodeOptions = {
  to: string;
  code: string;
  companyName?: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const portValue = process.env.SMTP_PORT;
  const secureValue = process.env.SMTP_SECURE;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !portValue || !secureValue || !user || !pass || !from) {
    throw new Error("Missing SMTP configuration");
  }

  return {
    host,
    port: Number.parseInt(portValue, 10),
    secure: secureValue === "true",
    user,
    pass,
    from,
  };
}

export async function sendSecurityCompanyCode(options: SendCodeOptions): Promise<boolean> {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const subject = "Your EquaSec login code";
  const companyLine = options.companyName ? `Company: ${options.companyName}\n` : "";
  const text = `Welcome to EquaSec.\n\nUsername: ${options.to}\nPassword: ${options.code}\n${companyLine}\nUse this code to log in. If you did not request this, ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1e293b;">
      <h2 style="margin: 0 0 12px; color: #1e3a5f;">EquaSec Login Details</h2>
      <p>Use the following credentials to log in:</p>
      <div style="margin: 12px 0;">
        <div><strong>Username:</strong> ${options.to}</div>
        <div><strong>Password:</strong> ${options.code}</div>
      </div>
      ${options.companyName ? `<p>Company: ${options.companyName}</p>` : ""}
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `EquaSec <${smtp.from}>`,
    to: options.to,
    subject,
    text,
    html,
  });

  return true;
}
