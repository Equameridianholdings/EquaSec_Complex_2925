import incidentSchema from "#db/incidentSchema.js";
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

export default incidentRouter;
