import nodemailer from "nodemailer";

interface SendCodeOptions {
  code: string;
  companyName?: string;
  to: string;
}

interface SmtpConfig {
  from: string;
  host: string;
  pass: string;
  port: number;
  secure: boolean;
  user: string;
}

interface SmtpPublicConfig {
  from: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
}

export async function sendSecurityCompanyCode(options: SendCodeOptions): Promise<boolean> {
  const smtp = getSmtpConfig();
  const smtpPublic: SmtpPublicConfig = {
    from: smtp.from,
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    user: smtp.user,
  };

  console.log("[email] preparing security company email", {
    smtp: smtpPublic,
    to: options.to,
  });

  const transporter = nodemailer.createTransport({
    auth: {
      pass: smtp.pass,
      user: smtp.user,
    },
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
  });

  try {
    await transporter.verify();
    console.log("[email] smtp verify successful", {
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      user: smtp.user,
    });
  } catch (error) {
    const smtpError = error as {
      code?: string;
      command?: string;
      response?: string;
      responseCode?: number;
    };
    console.error("[email] smtp verify failed", {
      code: smtpError.code,
      command: smtpError.command,
      response: smtpError.response,
      responseCode: smtpError.responseCode,
    });
    throw error;
  }

  const subject = "Your EquaSec login code";
  const loginUrl = "https://equasec.co.za/login";
  const text = `Welcome to EquaSec.\n\nUsername: ${options.to}\nPassword: ${options.code}\n\nLog in here: ${loginUrl}\n\nIf you did not request this, ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1e293b;">
      <h2 style="margin: 0 0 12px; color: #1e3a5f;">EquaSec Login Details</h2>
      <p>Use the following credentials to log in:</p>
      <div style="margin: 12px 0;">
        <div><strong>Username:</strong> ${options.to}</div>
        <div><strong>Password:</strong> ${options.code}</div>
      </div>
      <p>
        <a href="${loginUrl}" target="_blank" rel="noopener noreferrer">Click here to log in</a>
      </p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;

  const result = await transporter.sendMail({
    from: `EquaSec <${smtp.from}>`,
    html,
    subject,
    text,
    to: options.to,
  });

  console.log("[email] sendMail result", {
    accepted: result.accepted,
    messageId: result.messageId,
    rejected: result.rejected,
    response: result.response,
  });

  if (Array.isArray(result.rejected) && result.rejected.length > 0) {
    throw new Error(`SMTP rejected recipients: ${result.rejected.map(String).join(", ")}`);
  }

  return true;
}

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const portValue = process.env.SMTP_PORT;
  const secureValue = process.env.SMTP_SECURE;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;

  if (!host || !portValue || !secureValue || !user || !pass || !from) {
    const flags = {
      from: from ? "1" : "0",
      host: host ? "1" : "0",
      pass: pass ? "1" : "0",
      port: portValue ? "1" : "0",
      secure: secureValue ? "1" : "0",
      user: user ? "1" : "0",
    };
    throw new Error(
      `Missing SMTP configuration. host=${flags.host} port=${flags.port} secure=${flags.secure} user=${flags.user} pass=${flags.pass} from=${flags.from}`,
    );
  }

  const parsedPort = Number.parseInt(portValue, 10);
  if (!Number.isFinite(parsedPort)) {
    throw new Error(`Invalid SMTP_PORT value: ${portValue}`);
  }

  return {
    from,
    host,
    pass,
    port: parsedPort,
    secure: secureValue === "true",
    user,
  };
}
