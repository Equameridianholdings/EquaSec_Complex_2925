import incidentSchema from "#db/incidentSchema.js";
import { incidentBodyValidation, incidentDTO } from "#interfaces/incidentDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import { ValidObjectId } from "#utils/validObjectId.js";
import { Request, Response, Router } from "express";

const incidentRouter = Router();

incidentRouter.use(AuthMiddleware);

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
