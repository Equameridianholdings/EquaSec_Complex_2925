interface SosAlertInput {
  date: Date;
  guard: {
    _id?: string;
    cellNumber?: string;
    emailAddress?: string;
    name?: string;
    surname?: string;
  };
  station?: {
    complexAddress?: null | string;
    complexName?: string;
    gatedCommunityName?: string;
    name?: string;
    type?: string;
  };
}

interface SosDeliveryResult {
  call: "failed" | "sent" | "skipped";
  callError?: string;
  to: string;
  whatsapp: "failed" | "sent" | "skipped";
  whatsappError?: string;
  whatsappSid?: string;
  whatsappStatus?: string;
}

interface TwilioApiResult {
  error?: string;
  ok: boolean;
  sid?: string;
  status?: string;
}

interface TwilioParsedResponse {
  code?: number | string;
  message?: string;
  sid?: string;
  status?: string;
}

const parseTwilioResponse = (responseText: string): null | TwilioParsedResponse => {
  if (!responseText) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(responseText);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    return {
      code: typeof record.code === "string" || typeof record.code === "number" ? record.code : undefined,
      message: typeof record.message === "string" ? record.message : undefined,
      sid: typeof record.sid === "string" ? record.sid : undefined,
      status: typeof record.status === "string" ? record.status : undefined,
    };
  } catch {
    return null;
  }
};

const getEnv = (key: string): string => (process.env[key] ?? "").trim();

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = getEnv(key).toLowerCase();
  if (!value) {
    return defaultValue;
  }

  if (["1", "on", "true", "yes"].includes(value)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value)) {
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

const getTwilioAuthHeaders = (): null | { Authorization: string } => {
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
  const guardName = `${input.guard.name ?? ""} ${input.guard.surname ?? ""}`.trim() || "Unknown Guard";
  const guardPhone = (input.guard.cellNumber ?? "").trim();
  const guardEmail = (input.guard.emailAddress ?? "").trim();
  const stationType = (input.station?.type ?? "").trim().toLowerCase();
  const stationName = (input.station?.name ?? "").trim();
  const complexName = (input.station?.complexName ?? "").trim();
  const complexAddress = (input.station?.complexAddress ?? "").trim();
  const gatedCommunityName = (input.station?.gatedCommunityName ?? "").trim();

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
    return { error: "Missing Twilio WhatsApp config", ok: false };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const payload = new URLSearchParams({
    Body: body,
    From: `whatsapp:${fromWhatsApp}`,
    To: `whatsapp:${to}`,
  });

  try {
    const response = await fetch(endpoint, {
      body: payload,
      headers: {
        ...authHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const responseText = await response.text();
    const parsed = parseTwilioResponse(responseText);

    if (!response.ok) {
      const errorMessage = parsed?.message ?? (responseText || `Twilio WhatsApp error ${String(response.status)}`);
      const errorCode = parsed?.code ? ` (code ${String(parsed.code)})` : "";
      return { error: `${errorMessage}${errorCode}`, ok: false };
    }

    return {
      ok: true,
      sid: parsed?.sid,
      status: parsed?.status,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown WhatsApp error", ok: false };
  }
};

const makeTwimlMessage = (body: string): string => {
  const spoken = body.replace(/\n/g, ". ");
  return `<Response><Say voice="alice">${spoken}</Say></Response>`;
};

const sendCall = async (to: string, body: string): Promise<TwilioApiResult> => {
  const accountSid = getEnv("TWILIO_ACCOUNT_SID");
  const fromVoice = normalizePhoneNumber(getEnv("TWILIO_VOICE_FROM"));
  const authHeaders = getTwilioAuthHeaders();

  if (!accountSid || !fromVoice || !authHeaders) {
    return { error: "Missing Twilio voice config", ok: false };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
  const payload = new URLSearchParams({
    From: fromVoice,
    To: to,
    Twiml: makeTwimlMessage(body),
  });

  try {
    const response = await fetch(endpoint, {
      body: payload,
      headers: {
        ...authHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const responseText = await response.text();
    const parsed = parseTwilioResponse(responseText);

    if (!response.ok) {
      const errorMessage = parsed?.message ?? (responseText || `Twilio call error ${String(response.status)}`);
      const errorCode = parsed?.code ? ` (code ${String(parsed.code)})` : "";
      return { error: `${errorMessage}${errorCode}`, ok: false };
    }

    return {
      ok: true,
      sid: parsed?.sid,
      status: parsed?.status,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown call error", ok: false };
  }
};

export const sendSosAlerts = async (input: SosAlertInput): Promise<SosDeliveryResult[]> => {
  const recipients = getAlertRecipients();
  const whatsappEnabled = getEnvBoolean("SOS_WHATSAPP_ENABLED", true);
  const voiceEnabled = getEnvBoolean("SOS_VOICE_ENABLED", true);

  console.log("[SOS][Notifier] preparing alerts", {
    hasTwilioSid: Boolean(getEnv("TWILIO_ACCOUNT_SID")),
    hasTwilioToken: Boolean(getEnv("TWILIO_AUTH_TOKEN")),
    hasVoiceFrom: Boolean(getEnv("TWILIO_VOICE_FROM")),
    hasWhatsappFrom: Boolean(getEnv("TWILIO_WHATSAPP_FROM")),
    recipientCount: recipients.length,
    voiceEnabled,
    whatsappEnabled,
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
        console.error("[SOS][Notifier] whatsapp failed", { error: whatsapp.error, recipient });
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
        console.error("[SOS][Notifier] call failed", { error: call.error, recipient });
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
        call: voiceEnabled ? (call.ok ? "sent" : "failed") : "skipped",
        callError: call.ok ? undefined : call.error,
        to: recipient,
        whatsapp: whatsappEnabled ? (whatsapp.ok ? "sent" : "failed") : "skipped",
        whatsappError: whatsapp.ok ? undefined : whatsapp.error,
        whatsappSid: whatsapp.sid,
        whatsappStatus: whatsapp.status,
      } as SosDeliveryResult;
    }),
  );

  console.log("[SOS][Notifier] completed deliveries", deliveries);

  return deliveries;
};
