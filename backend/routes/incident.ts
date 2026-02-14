import incidentSchema from "#db/incidentSchema.js";
import { incidentDTO } from "#interfaces/incidentDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import isValidObjectID from "#utils/isValidObjectID.js";
import { Router } from "express";
import { ObjectId } from "mongodb";

const incidentRouter = Router();

incidentRouter.use(AuthMiddleware);

incidentRouter.get("/", async (req, res) => {
    try {
        const incidents = await incidentSchema.find({});

        if (incidents.length === 0) {
            res.status(404).json({ message: "No incidents found!"});
            return;
        }

        res.status(200).json(incidents);
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

incidentRouter.get("/:id", async (req, res) => {
    const _id = req.params.id;
    if (!isValidObjectID(_id)) {
        res.status(400).json({ message: "Bad request! Invalid Id."});
        return;
    }

    const incidentQuery = {
        "sos.gaurd.securityCompany._id": new ObjectId(_id),
    };

    try {
        const incidents = await incidentSchema.find(incidentQuery);

        if (incidents.length === 0) {
            res.status(404).json({ message: "No incidents found!"});
            return;
        }

        res.status(200).json(incidents);
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

incidentRouter.post("/", async (req, res) => {
    const incident = req.body as incidentDTO;
    try {
        const newIncident = new incidentSchema(incident);
        await newIncident.save();

        res.status(201).json({ message: "Incident successfully reported!", payload: newIncident});
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

incidentRouter.delete("/:id", async (req, res) => {
    const _id = req.params.id;
    if (!isValidObjectID(_id)) {
        res.status(400).json({ message: "Bad request! Invalid Id."});
        return;
    }

    try {
        const deletedIncident = await incidentSchema.findByIdAndDelete(new ObjectId(_id));

        if (deletedIncident === null) {
            res.status(404).json({ message: "Incident does not exist!"});
            return;
        }

        res.status(200).json({ message: "Incident successfully deleted!", payload: deletedIncident});
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

export default incidentRouter;