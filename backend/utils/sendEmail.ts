import { UserDTO } from "#interfaces/userDTO.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

const CLIENT_URI = process.env.CLIENT_URI;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EMAIL_FOOTER_IMAGE_CID = "equameridian-footer-logo";
const EMAIL_FOOTER_WEBSITE = "https://www.equameridianholdings.com/";
export interface SendEmailOptions {
  hash: string;
  to: string;
  user: UserDTO;
}

interface SendCodeOptions {
  code: string;
  companyName?: string;
  to: string;
}

interface SendCustomEmailOptions {
  attachments?: { content: string; filename: string }[];
  message: string;
  recipients: string[];
  subject: string;
}

interface SendRegistrationLinkOptions {
  address: string;
  residenceType: string;
  to: string;
  token: string;
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

export async function sendCustomEmail(options: SendCustomEmailOptions): Promise<boolean> {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    auth: {
      pass: smtp.pass,
      user: smtp.user,
    },
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
  });

  await transporter.verify();

  const footerLogoAttachment = getFooterLogoAttachment();
  const recipients = Array.from(
    new Set(
      options.recipients
        .map((recipient) => recipient.trim().toLowerCase())
        .filter((recipient) => recipient.length > 0),
    ),
  );

  if (recipients.length === 0) {
    throw new Error("At least one recipient is required.");
  }

  const safeMessage = escapeEmailHtml(options.message.trim()).replace(/\n/g, "<br />");
  const subject = options.subject.trim();
  const text = `${options.message.trim()}\n\nKind regards,\nThe EquaSec Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 24px;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px;">
        <h2 style="margin: 0 0 12px; color: #1e3a5f;">${escapeEmailHtml(subject)}</h2>
        <p style="margin: 0 0 16px;">Please see the message below from the EquaSec admin team.</p>
        <div style="margin: 16px 0; padding: 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; white-space: normal;">
          ${safeMessage}
        </div>
        <p style="margin: 0;">Kind regards,<br />The EquaSec Team</p>

        ${footerLogoAttachment ? `
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
            <a
              href="${EMAIL_FOOTER_WEBSITE}"
              target="_blank"
              rel="noopener noreferrer"
              title="Visit Equameridian Holdings"
              style="display: inline-block; text-decoration: none; cursor: pointer;"
            >
              <img
                src="cid:${EMAIL_FOOTER_IMAGE_CID}"
                alt="Equameridian Holdings"
                style="max-width: 220px; width: 100%; height: auto; display: inline-block; cursor: pointer;"
              />
            </a>
            <div style="margin-top: 8px; font-size: 13px; color: #2563eb;">
              Click the logo to visit our website
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  const extraAttachments = (options.attachments ?? []).map((a) => ({
    content: Buffer.from(a.content, 'base64'),
    contentType: 'application/pdf',
    filename: a.filename,
  }));

  await Promise.all(
    recipients.map((recipient) =>
      transporter.sendMail({
        attachments: [...(footerLogoAttachment ? [footerLogoAttachment] : []), ...extraAttachments],
        from: `EquaSec <${smtp.from}>`,
        html,
        subject,
        text,
        to: recipient,
      }),
    ),
  );

  return true;
}

export async function sendForgotPasswordEmail(options: SendEmailOptions): Promise<boolean> {
  const smtp = getSmtpConfig();

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

  const subject = "Your EquaSec Change Password Link";
  const text = `Hey there ${options.user.name} ${options.user.surname}, \n\nSeems like you've hit a little snag with your password!\n\nUse the following url to change your password:\n\nClick here: ${CLIENT_URI as unknown as string}/forgot-password/${encodeURIComponent(options.user.emailAddress).replace(/%20/g, "+")}/${encodeURIComponent(options.hash).replace(/%20/g, "+")}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1e293b;">
      <h2 style="margin: 0 0 12px; color: #1e3a5f;">Forgot Password?</h2>
      <div style="margin: 12px 0;">
        <div></div>
      </div>
      <p>${text}</p>
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

  if (Array.isArray(result.rejected) && result.rejected.length > 0) {
    throw new Error(`SMTP rejected recipients: ${result.rejected.map(String).join(", ")}`);
  }

  return true;
}

export async function sendRegistrationLink(options: SendRegistrationLinkOptions): Promise<boolean> {
  const smtp = getSmtpConfig();
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

  const footerLogoAttachment = getFooterLogoAttachment();
  const registrationUrl = `https://equasec.co.za/register-tenant?token=${encodeURIComponent(options.token)}`;
  const subject = "Complete Your EquaSec Resident Registration";
  const text = `Welcome to EquaSec!\n\nYou have been invited to register as a resident at ${options.address}.\n\nPlease click the following link to complete your registration:\n\n${registrationUrl}\n\nThis link will expire after use and is valid for 7 days.\n\nIf you did not request this registration, please ignore this email.\n\nKind regards,\nThe EquaSec Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 24px;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px;">
        <h2 style="margin: 0 0 12px; color: #1e3a5f;">Complete Your Registration</h2>
        <p style="margin: 0 0 12px;">Welcome to EquaSec!</p>
        <p style="margin: 0 0 16px;">You have been invited to register as a resident at <strong>${escapeEmailHtml(options.address)}</strong>.</p>

        <div style="margin: 24px 0; text-align: center;">
          <a
            href="${registrationUrl}"
            style="display: inline-block; padding: 14px 32px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;"
          >
            Complete Registration
          </a>
        </div>

        <p style="margin: 0 0 12px; font-size: 14px; color: #64748b;">Or copy and paste this link into your browser:</p>
        <p style="margin: 0 0 16px; font-size: 14px; word-break: break-all; color: #2563eb;">${registrationUrl}</p>

        <div style="margin: 16px 0; padding: 12px; background: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>⚠️ Important:</strong> This link will expire after you successfully register and is valid for 7 days.
          </p>
        </div>

        <p style="margin: 0 0 12px;">If you did not request this registration, please ignore this email.</p>
        <p style="margin: 0;">Kind regards,<br />The EquaSec Team</p>

        ${footerLogoAttachment ? `
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
            <a
              href="${EMAIL_FOOTER_WEBSITE}"
              target="_blank"
              rel="noopener noreferrer"
              title="Visit Equameridian Holdings"
              style="display: inline-block; text-decoration: none; cursor: pointer;"
            >
              <img
                src="cid:${EMAIL_FOOTER_IMAGE_CID}"
                alt="Equameridian Holdings"
                style="max-width: 220px; width: 100%; height: auto; display: inline-block; cursor: pointer;"
              />
            </a>
            <div style="margin-top: 8px; font-size: 13px; color: #2563eb;">
              Click the logo to visit our website
            </div>
          </div>
        ` : ""}
      </div>
    </div>
  `;

  const result = await transporter.sendMail({
    attachments: footerLogoAttachment ? [footerLogoAttachment] : [],
    from: `EquaSec <${smtp.from}>`,
    html,
    subject,
    text,
    to: options.to,
  });

  if (Array.isArray(result.rejected) && result.rejected.length > 0) {
    throw new Error(`SMTP rejected recipients: ${result.rejected.map(String).join(", ")}`);
  }

  return true;
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

  const footerLogoAttachment = getFooterLogoAttachment();
  const subject = "Welcome to EquaSec - Your Account Details";
  const introduction = "An EquaSec account has been created for you.";
  const text = `Welcome to EquaSec.\n\n${introduction}\n\nPlease use the details below to sign in:\nUsername: ${options.to}\nTemporary Password: ${options.code}\n\nLogin Portal: https://equasec.co.za/login\nProduct Guide & Training Videos: https://info.equasec.co.za/\n\nFor security, please sign in and update your password as soon as possible.\n\nIf you were not expecting this email, please ignore it.\n\nKind regards,\nThe EquaSec Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 24px;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px;">
        <h2 style="margin: 0 0 12px; color: #1e3a5f;">Welcome to EquaSec</h2>
        <p style="margin: 0 0 12px;">${introduction}</p>
        <p style="margin: 0 0 16px;">Please use the account details below to sign in to the platform.</p>

        <div style="margin: 16px 0; padding: 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
          <div><strong>Username:</strong> ${options.to}</div>
          <div><strong>Temporary Password:</strong> ${options.code}</div>
        </div>

        <p style="margin: 0 0 10px;">
          <strong>Login Portal:</strong>
          <a href="https://equasec.co.za/login">https://equasec.co.za/login</a>
        </p>
        <p style="margin: 0 0 16px;">
          <strong>Product Guide & Training Videos:</strong>
          <a href="https://info.equasec.co.za/">https://info.equasec.co.za/</a>
        </p>

        <p style="margin: 0 0 12px;">For security, please sign in and update your password as soon as possible.</p>
        <p style="margin: 0 0 12px;">If you were not expecting this email, please ignore it.</p>
        <p style="margin: 0;">Kind regards,<br />The EquaSec Team</p>

        ${footerLogoAttachment ? `
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
            <a
              href="${EMAIL_FOOTER_WEBSITE}"
              target="_blank"
              rel="noopener noreferrer"
              title="Visit Equameridian Holdings"
              style="display: inline-block; text-decoration: none; cursor: pointer;"
            >
              <img
                src="cid:${EMAIL_FOOTER_IMAGE_CID}"
                alt="Equameridian Holdings"
                style="max-width: 220px; width: 100%; height: auto; display: inline-block; cursor: pointer;"
              />
            </a>
            <div style="margin-top: 8px; font-size: 13px; color: #2563eb;">
              Click the logo to visit our website
            </div>
          </div>
        ` : ""}
      </div>
    </div>
  `;

  const result = await transporter.sendMail({
    attachments: footerLogoAttachment ? [footerLogoAttachment] : [],
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

function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFooterLogoAttachment() {
  const candidatePaths = [
    path.resolve(process.cwd(), "frontend/public/Equameridian Holdings .jpeg"),
    path.resolve(process.cwd(), "../frontend/public/Equameridian Holdings .jpeg"),
    path.resolve(__dirname, "../../frontend/public/Equameridian Holdings .jpeg"),
  ];

  const resolvedPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  if (!resolvedPath) {
    return undefined;
  }

  return {
    cid: EMAIL_FOOTER_IMAGE_CID,
    filename: "Equameridian Holdings.jpeg",
    path: resolvedPath,
  };
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
