import incidentSchema from "#db/incidentSchema.js";
import reportAuthSchema from "#db/reportAuthSchema.js";
import securityCompanySchema from "#db/securityCompanySchema.js";
import userSchema from "#db/userSchema.js";
import { incidentBodyValidation, incidentDTO } from "#interfaces/incidentDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import { sendCustomEmail } from "#utils/sendEmail.js";
import { ValidObjectId } from "#utils/validObjectId.js";
import { Request, Response, Router } from "express";

const incidentRouter = Router();

incidentRouter.use(AuthMiddleware);

incidentRouter.post("/email-report", async (req: Request, res: Response) => {
  const body = req.body as {
    guardName?: unknown;
    pdfBase64?: unknown;
    recipientEmail?: unknown;
  };

  const { guardName, pdfBase64, recipientEmail } = body;

  if (!recipientEmail || typeof recipientEmail !== "string" || !recipientEmail.trim()) {
    res.status(400).json({ message: "Recipient email is required." });
    return;
  }

  if (!pdfBase64 || typeof pdfBase64 !== "string" || !pdfBase64.trim()) {
    res.status(400).json({ message: "PDF content is required." });
    return;
  }

  const reporterName = typeof guardName === "string" && guardName.trim() ? guardName.trim() : "A guard";
  const message = `Please find the EquaSec Incident Book report for ${reporterName} attached as a PDF.`;
  const safeGuardName = reporterName.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");

  // Strip data URI prefix if present
  const base64Content = pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();

  try {
    await sendCustomEmail({
      attachments: [
        {
          content: base64Content,
          filename: `EquaSec_IncidentBook_${safeGuardName}.pdf`,
        },
      ],
      message,
      recipients: [recipientEmail.trim()],
      subject: `EquaSec Incident Book — ${reporterName}`,
    });

    res.status(200).json({ message: "Report sent successfully." });
    return;
  } catch {
    res.status(500).json({ message: "Failed to send email. Please try again." });
    return;
  }
});

incidentRouter.get("/my-reports", async (req, res) => {
  const email = res.get('email');

  if (!email) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    // Look up the guard to get their assigned sites
    const guardDoc = await userSchema.findOne({ emailAddress: email }).lean().exec();

    if (!guardDoc) {
      res.status(404).json({ message: "Guard not found" });
      return;
    }

    const guard = guardDoc as {
      assignedCommunities?: unknown[];
      assignedComplexes?: unknown[];
      employeeContracts?: { assignedCommunities?: unknown[]; assignedComplexes?: unknown[] }[];
    };

    // Collect all assigned complex IDs and gated community IDs
    const complexIdSet = new Set<string>();
    const communityIdSet = new Set<string>();

    const addIds = (arr: unknown, set: Set<string>) => {
      if (Array.isArray(arr)) {
        for (const v of arr) {
          const s = String(v ?? '').trim();
          if (s) set.add(s);
        }
      }
    };

    addIds(guard.assignedComplexes, complexIdSet);
    addIds(guard.assignedCommunities, communityIdSet);

    if (Array.isArray(guard.employeeContracts)) {
      for (const contract of guard.employeeContracts) {
        addIds(contract.assignedComplexes, complexIdSet);
        addIds(contract.assignedCommunities, communityIdSet);
      }
    }

    const complexIds = Array.from(complexIdSet);
    const communityIds = Array.from(communityIdSet);

    if (complexIds.length === 0 && communityIds.length === 0) {
      res.status(200).json({ message: "Incidents retrieved", payload: [] });
      return;
    }

    const orClauses: object[] = [];
    if (complexIds.length > 0) {
      orClauses.push({ "sos.station.complexId": { $in: complexIds } });
    }
    if (communityIds.length > 0) {
      orClauses.push({ "sos.station.gatedCommunityId": { $in: communityIds } });
    }

    const incidents = await incidentSchema
      .find({ $or: orClauses })
      .sort({ "sos.date": -1 })
      .exec();

    res.status(200).json({ message: "Incidents retrieved", payload: incidents });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

incidentRouter.get("/", async (req, res) => {
  try {
    const incidents = await incidentSchema.find({}).select({}).exec();

    if (incidents.length === 0) {
      res.status(404).json({ message: "No incidents found!" });
      return;
    }

    res.status(200).json(incidents);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

incidentRouter.get("/pending-auth", async (req, res) => {
  const email = res.get("email");
  if (!email) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const pending = await reportAuthSchema
      .find({ securityCompanyManagerEmail: email, status: "pending" })
      .select("-pdfBase64")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    res.status(200).json({ message: "Pending authorisations retrieved", payload: pending });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

incidentRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  const incidentQuery = {
    "sos.gaurd.securityCompany._id": ValidObjectId(id),
  };

  try {
    const incidents = await incidentSchema.find(incidentQuery).select({}).exec();

    if (incidents.length === 0) {
      res.status(404).json({ message: "No incidents found!" });
      return;
    }

    res.status(200).json(incidents);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

incidentRouter.post("/guard-report", async (req: Request, res: Response) => {
  const body = req.body as {
    description?: unknown;
    guard?: Record<string, unknown>;
    reportedAt?: unknown;
    station?: Record<string, unknown>;
  };
  const { description, guard, reportedAt, station } = body;

  if (!description || typeof description !== "string" || !description.trim()) {
    res.status(400).json({ message: "Description is required" });
    return;
  }

  try {
    const newIncident = new incidentSchema({
      description: description.trim(),
      sos: {
        date: reportedAt ? new Date(reportedAt as Date | number | string) : new Date(),
        guard: guard ?? {},
        station: station ?? {},
      },
    });

    await newIncident.save();

    res.status(201).json({ message: "Incident successfully reported!", payload: newIncident });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

incidentRouter.post("/", incidentBodyValidation, validateSchema, async (req: Request, res: Response) => {
  const incident = req.body as incidentDTO;

  try {
    const newIncident = new incidentSchema(incident);
    await newIncident.save();

    res.status(201).json({ message: "Incident successfully reported!", payload: newIncident });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

incidentRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedIncident = await incidentSchema.findByIdAndDelete(ValidObjectId(id)).exec();

    if (deletedIncident === null) {
      res.status(404).json({ message: "Incident does not exist!" });
      return;
    }

    res.status(200).json({ message: "Incident successfully deleted!", payload: deletedIncident });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

incidentRouter.post("/request-report-auth", async (req, res) => {
  const guardEmail = res.get("email");
  if (!guardEmail) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const body = req.body as {
    guardName?: unknown;
    pdfBase64?: unknown;
    recipientEmail?: unknown;
    recipientName?: unknown;
    recipientSurname?: unknown;
  };

  const { guardName, pdfBase64, recipientEmail, recipientName, recipientSurname } = body;

  if (!recipientName || typeof recipientName !== "string" || !recipientName.trim()) {
    res.status(400).json({ message: "Recipient name is required." });
    return;
  }
  if (!recipientSurname || typeof recipientSurname !== "string" || !recipientSurname.trim()) {
    res.status(400).json({ message: "Recipient surname is required." });
    return;
  }
  if (!recipientEmail || typeof recipientEmail !== "string" || !recipientEmail.trim()) {
    res.status(400).json({ message: "Recipient email is required." });
    return;
  }
  if (!pdfBase64 || typeof pdfBase64 !== "string" || !pdfBase64.trim()) {
    res.status(400).json({ message: "PDF content is required." });
    return;
  }

  try {
    const guardDoc = await userSchema.findOne({ emailAddress: guardEmail }).lean().exec();

    if (!guardDoc) {
      res.status(404).json({ message: "Guard account not found." });
      return;
    }

    const guard = guardDoc as {
      name?: string;
      securityCompany?: { _id?: unknown; managerEmail?: string; name?: string };
      surname?: string;
    };

    const sc = guard.securityCompany;
    if (!sc?._id) {
      res.status(400).json({ message: "You are not linked to a security company. Please contact your administrator." });
      return;
    }

    // Look up the live security company record to get the manager email
    const companyDoc = await securityCompanySchema
      .findById(String(sc._id as { toString(): string }))
      .select({ managerEmail: 1, name: 1 })
      .lean()
      .exec();
    const companyRecord = companyDoc as null | { managerEmail?: string; name?: string };

    const managerEmail = companyRecord?.managerEmail ?? "";
    if (!managerEmail) {
      res.status(400).json({ message: "Report sending is currently unavailable. Please contact your administrator." });
      return;
    }

    const companyName = companyRecord?.name ?? sc.name ?? "";

    const reporterName =
      typeof guardName === "string" && guardName.trim()
        ? guardName.trim()
        : `${guard.name ?? ""} ${guard.surname ?? ""}`.trim() || "A guard";

    await reportAuthSchema.create({
      guardEmail,
      guardName: reporterName,
      pdfBase64: pdfBase64.trim(),
      recipientEmail: recipientEmail.trim(),
      recipientName: recipientName.trim(),
      recipientSurname: recipientSurname.trim(),
      securityCompanyId: String(sc._id as { toString(): string }),
      securityCompanyManagerEmail: managerEmail,
      securityCompanyName: companyName,
    });

    await sendCustomEmail({
      message:
        `${reporterName} has submitted an incident report PDF for review.\n\n` +
        `Intended recipient: ${recipientName.trim()} ${recipientSurname.trim()} <${recipientEmail.trim()}>\n\n` +
        `Please log in to the EquaSec portal to review this request.`,
      recipients: [managerEmail],
      subject: `EquaSec — Report Request from ${reporterName}`,
    });

    res.status(201).json({ message: "Request submitted. You will be notified once the report has been sent." });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

incidentRouter.post("/authorise-report/:id", async (req, res) => {
  const email = res.get("email");
  if (!email) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { id } = req.params;

  try {
    const requestDoc = await reportAuthSchema.findById(id).lean().exec();

    if (!requestDoc) {
      res.status(404).json({ message: "Authorisation request not found." });
      return;
    }

    const authRequest = requestDoc as {
      guardName?: string;
      pdfBase64?: string;
      recipientEmail?: string;
      recipientName?: string;
      recipientSurname?: string;
      securityCompanyManagerEmail?: string;
      status?: string;
    };

    if (authRequest.securityCompanyManagerEmail !== email) {
      res.status(403).json({ message: "You are not authorised to approve this request." });
      return;
    }

    if (authRequest.status === "sent") {
      res.status(409).json({ message: "This report has already been sent." });
      return;
    }

    const base64Content = (authRequest.pdfBase64 ?? "").replace(/^data:application\/pdf;base64,/, "").trim();
    const guardSafeName = (authRequest.guardName ?? "Guard").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
    const recipientFullName = `${authRequest.recipientName ?? ""} ${authRequest.recipientSurname ?? ""}`.trim();

    await sendCustomEmail({
      attachments: [{ content: base64Content, filename: `EquaSec_IncidentBook_${guardSafeName}.pdf` }],
      message: `Please find the EquaSec Incident Book report attached, as requested by ${authRequest.guardName ?? "a guard"}.`,
      recipients: [authRequest.recipientEmail ?? ""],
      subject: `EquaSec Incident Book — ${authRequest.guardName ?? "Guard"}`,
    });

    await reportAuthSchema.findByIdAndUpdate(id, { status: "sent" }).exec();

    res.status(200).json({ message: `Report sent to ${recipientFullName}.` });
    return;
  } catch (err) {
    console.error("[authorise-report] Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

incidentRouter.post("/reject-report/:id", async (req, res) => {
  const email = res.get("email");
  if (!email) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { id } = req.params;

  try {
    const requestDoc = await reportAuthSchema.findById(id).lean().exec();

    if (!requestDoc) {
      res.status(404).json({ message: "Authorisation request not found." });
      return;
    }

    const authRequest = requestDoc as {
      guardEmail?: string;
      guardName?: string;
      recipientEmail?: string;
      recipientName?: string;
      recipientSurname?: string;
      securityCompanyManagerEmail?: string;
      securityCompanyName?: string;
      status?: string;
    };

    if (authRequest.securityCompanyManagerEmail !== email) {
      res.status(403).json({ message: "You are not authorised to reject this request." });
      return;
    }

    if (authRequest.status === "sent") {
      res.status(409).json({ message: "This report has already been sent and cannot be rejected." });
      return;
    }

    await reportAuthSchema.findByIdAndDelete(id).exec();

    const guardEmail = authRequest.guardEmail ?? "";
    if (guardEmail) {
      const recipientFullName =
        `${authRequest.recipientName ?? ""} ${authRequest.recipientSurname ?? ""}`.trim() ||
        (authRequest.recipientEmail ?? "the intended recipient");
      await sendCustomEmail({
        message:
          `Your request to send an incident report PDF to ${recipientFullName} has not been approved.\n\n` +
          `If you have any questions, please contact your administrator at ${email}.`,
        recipients: [guardEmail],
        subject: "EquaSec — Report Request Declined",
      });
    }

    res.status(200).json({ message: "Request declined. The submitter has been notified." });
    return;
  } catch (err) {
    console.error("[reject-report] Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

export default incidentRouter;
