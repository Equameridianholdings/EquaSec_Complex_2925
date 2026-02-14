import sosSchema from "#db/sosSchema.js";
import { SOSDTO } from "#interfaces/sosDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import isValidObjectID from "#utils/isValidObjectID.js";
import { Router } from "express";
import { ObjectId } from "mongodb";

const sosRouter = Router();

sosRouter.use(AuthMiddleware);

sosRouter.get("/", async (req, res) => {
    try {
        const SOS = await sosSchema.find({});

        if (SOS.length === 0) {
            res.status(404).json({ message: "No sos's found!"});
            return;
        }

        res.status(200).json(SOS);
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

sosRouter.get("/:id", async (req, res) => {
    const _id = req.params.id;
    if (!isValidObjectID(_id)) {
        res.status(400).json({ message: "Bad request! Invalid Id."});
        return;
    }
    
    const sosQuery = {
        "gaurd.securityCompany": new ObjectId(_id),
    };
    try {
        const sos = await sosSchema.find(sosQuery);

        if (sos.length === 0) {
            res.status(404).json({ message: "No sos's found!"});
            return;
        }

        res.status(200).json(sos);
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

sosRouter.post("/", async (req, res) => {
    const sos = req.body as SOSDTO;
    try {
        const newSOS = new sosSchema(sos);
        await newSOS.save();

        res.status(201).json({ message: "SOS successfully called!", payload: sos});
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

sosRouter.delete("/:id", async (req, res) => {
    const _id = req.params.id;
    if (!isValidObjectID(_id)) {
        res.status(400).json({ message: "Bad request! Invalid Id."});
        return;
    }

    try {
        const deletedSOS = await sosSchema.findByIdAndDelete(new ObjectId(_id));

        if (deletedSOS === null) {
            res.status(404).json({ message: "SOS does not exist!"});
            return;
        }

        res.status(200).json({ message: "SOS successfully deleted!", payload: deletedSOS});
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

export default sosRouter;