import incidentSchema from "#db/incidentSchema.js";
import { incidentBodyValidation, incidentDTO } from "#interfaces/incidentDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import validateObjectId from "#utils/validateObjectId.js";
import { Router } from "express";
import { ObjectId } from "mongodb";

const incidentRouter = Router();

incidentRouter.use(AuthMiddleware);

incidentRouter.get("/", async (req, res) => {
  try {
    const incidents = await incidentSchema.find({});

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

incidentRouter.get("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request." });

  const _id = req.params.id as ObjectId;
  const incidentQuery = {
    "sos.gaurd.securityCompany._id": _id,
  };

  try {
    const incidents = await incidentSchema.find(incidentQuery);

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

incidentRouter.post("/", async (req, res) => {
  const validated = await incidentBodyValidation.run(req);

  if (validated.length > 0) return res.status(400).json({ message: "Invalid details", payload: validated });

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

incidentRouter.delete("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request." });

  const _id = req.params.id as ObjectId;

  try {
    const deletedIncident = await incidentSchema.findByIdAndDelete(_id);

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
