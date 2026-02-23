type SosAlertInput = {
  date: Date;
  guard: {
    _id?: string;
    name?: string;
    surname?: string;
    emailAddress?: string;
    cellNumber?: string;
  };
  station?: {
    type?: string;
    name?: string;
    complexName?: string;
    complexAddress?: string | null;
    gatedCommunityName?: string;
  };
};

type SosDeliveryResult = {
  to: string;
  whatsapp: "sent" | "failed" | "skipped";
  call: "sent" | "failed" | "skipped";
  whatsappSid?: string;
  whatsappStatus?: string;
  whatsappError?: string;
  callError?: string;
};

type TwilioApiResult = {
  ok: boolean;
  error?: string;
  sid?: string;
  status?: string;
};

const getEnv = (key: string): string => String(process.env[key] ?? "").trim();

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = getEnv(key).toLowerCase();
  if (!value) {
    return defaultValue;
  }

  if (["true", "1", "yes", "on"].includes(value)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(value)) {
    return false;
  }

  return defaultValue;
};

const normalizePhoneNumber = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("+")) {
    return trimmed;
  }

  return `+${trimmed.replace(/\D/g, "")}`;
};

const getAlertRecipients = (): string[] => {
  const csv = getEnv("SOS_ALERT_NUMBERS");
  if (!csv) {
    return [];
  }

  return csv
    .split(",")
    .map((entry) => normalizePhoneNumber(entry))
    .filter((entry) => entry.length > 0);
};

const getTwilioAuthHeaders = (): { Authorization: string } | null => {
  const accountSid = getEnv("TWILIO_ACCOUNT_SID");
  const authToken = getEnv("TWILIO_AUTH_TOKEN");

  if (!accountSid || !authToken) {
    return null;
  }

  return {
    Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
  };
};

const buildSosMessage = (input: SosAlertInput): string => {
  const guardName = `${input.guard?.name ?? ""} ${input.guard?.surname ?? ""}`.trim() || "Unknown Guard";
  const guardPhone = String(input.guard?.cellNumber ?? "").trim();
  const guardEmail = String(input.guard?.emailAddress ?? "").trim();
  const stationType = String(input.station?.type ?? "").trim().toLowerCase();
  const stationName = String(input.station?.name ?? "").trim();
  const complexName = String(input.station?.complexName ?? "").trim();
  const complexAddress = String(input.station?.complexAddress ?? "").trim();
  const gatedCommunityName = String(input.station?.gatedCommunityName ?? "").trim();

  const stationLabel = stationType === "gated"
    ? "Gated Community"
    : stationType === "complex"
      ? "Complex"
      : "Station";

  const stationDisplay =
    stationType === "gated"
      ? [gatedCommunityName || stationName, complexName ? `Complex: ${complexName}` : ""].filter((line) => line.length > 0).join(" | ")
      : stationType === "complex"
        ? (complexName || stationName)
        : stationName;

  const date = new Date(input.date);
  const isoDate = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();

  return [
    "🚨 SOS ALERT",
    `Guard: ${guardName}`,
    guardPhone ? `Phone: ${guardPhone}` : "",
    guardEmail ? `Email: ${guardEmail}` : "",
    stationDisplay ? `${stationLabel}: ${stationDisplay}` : "",
    complexAddress ? `Address: ${complexAddress}` : "",
    `Time: ${isoDate}`,
  ]
    .filter((line) => line.length > 0)
    .join("\n");
};

const sendWhatsApp = async (to: string, body: string): Promise<TwilioApiResult> => {
  const accountSid = getEnv("TWILIO_ACCOUNT_SID");
  const fromWhatsApp = normalizePhoneNumber(getEnv("TWILIO_WHATSAPP_FROM"));
  const authHeaders = getTwilioAuthHeaders();

  if (!accountSid || !fromWhatsApp || !authHeaders) {
    return { ok: false, error: "Missing Twilio WhatsApp config" };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const payload = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: `whatsapp:${fromWhatsApp}`,
    Body: body,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
    });

    const responseText = await response.text();
    let parsed: any = null;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const errorMessage = parsed?.message || responseText || `Twilio WhatsApp error ${response.status}`;
      const errorCode = parsed?.code ? ` (code ${parsed.code})` : "";
      return { ok: false, error: `${errorMessage}${errorCode}` };
    }

    return {
      ok: true,
      sid: parsed?.sid,
      status: parsed?.status,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown WhatsApp error" };
  }
};

const makeTwimlMessage = (body: string): string => {
  const spoken = body.replace(/\n/g, ". ");
  return `<Response><Say voice=\"alice\">${spoken}</Say></Response>`;
};

const sendCall = async (to: string, body: string): Promise<TwilioApiResult> => {
  const accountSid = getEnv("TWILIO_ACCOUNT_SID");
  const fromVoice = normalizePhoneNumber(getEnv("TWILIO_VOICE_FROM"));
  const authHeaders = getTwilioAuthHeaders();

  if (!accountSid || !fromVoice || !authHeaders) {
    return { ok: false, error: "Missing Twilio voice config" };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
  const payload = new URLSearchParams({
    To: to,
    From: fromVoice,
    Twiml: makeTwimlMessage(body),
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
    });

    const responseText = await response.text();
    let parsed: any = null;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const errorMessage = parsed?.message || responseText || `Twilio call error ${response.status}`;
      const errorCode = parsed?.code ? ` (code ${parsed.code})` : "";
      return { ok: false, error: `${errorMessage}${errorCode}` };
    }

    return {
      ok: true,
      sid: parsed?.sid,
      status: parsed?.status,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown call error" };
  }
};

export const sendSosAlerts = async (input: SosAlertInput): Promise<SosDeliveryResult[]> => {
  const recipients = getAlertRecipients();
  const whatsappEnabled = getEnvBoolean("SOS_WHATSAPP_ENABLED", true);
  const voiceEnabled = getEnvBoolean("SOS_VOICE_ENABLED", true);

  console.log("[SOS][Notifier] preparing alerts", {
    recipientCount: recipients.length,
    whatsappEnabled,
    voiceEnabled,
    hasTwilioSid: Boolean(getEnv("TWILIO_ACCOUNT_SID")),
    hasTwilioToken: Boolean(getEnv("TWILIO_AUTH_TOKEN")),
    hasWhatsappFrom: Boolean(getEnv("TWILIO_WHATSAPP_FROM")),
    hasVoiceFrom: Boolean(getEnv("TWILIO_VOICE_FROM")),
  });

  if (recipients.length === 0) {
    console.warn("[SOS][Notifier] no SOS_ALERT_NUMBERS configured; skipping outbound alerts");
    return [];
  }

  const body = buildSosMessage(input);
  console.log("[SOS][Notifier] message preview", body);

  const deliveries = await Promise.all(
    recipients.map(async (recipient) => {
      console.log("[SOS][Notifier] sending to recipient", recipient);
      const whatsapp = whatsappEnabled
        ? await sendWhatsApp(recipient, body)
        : { ok: true, status: "skipped" };
      const call = voiceEnabled
        ? await sendCall(recipient, body)
        : { ok: true, status: "skipped" };

      if (!whatsappEnabled) {
        console.log("[SOS][Notifier] whatsapp skipped by SOS_WHATSAPP_ENABLED=false", { recipient });
      } else if (!whatsapp.ok) {
        console.error("[SOS][Notifier] whatsapp failed", { recipient, error: whatsapp.error });
      } else {
        console.log("[SOS][Notifier] whatsapp accepted", {
          recipient,
          sid: whatsapp.sid,
          status: whatsapp.status,
        });
      }

      if (!voiceEnabled) {
        console.log("[SOS][Notifier] call skipped by SOS_VOICE_ENABLED=false", { recipient });
      } else if (!call.ok) {
        console.error("[SOS][Notifier] call failed", { recipient, error: call.error });
      } else {
        console.log("[SOS][Notifier] call accepted", {
          recipient,
          sid: call.sid,
          status: call.status,
        });
      }

      if (whatsapp.ok && call.ok) {
        console.log("[SOS][Notifier] whatsapp + call sent", { recipient });
      }

      return {
        to: recipient,
        whatsapp: whatsappEnabled ? (whatsapp.ok ? "sent" : "failed") : "skipped",
        call: voiceEnabled ? (call.ok ? "sent" : "failed") : "skipped",
        whatsappSid: whatsapp.sid,
        whatsappStatus: whatsapp.status,
        whatsappError: whatsapp.ok ? undefined : whatsapp.error,
        callError: call.ok ? undefined : call.error,
      } as SosDeliveryResult;
    }),
  );

  console.log("[SOS][Notifier] completed deliveries", deliveries);

  return deliveries;
};
