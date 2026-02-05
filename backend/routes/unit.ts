
import unitSchema from "#db/unitSchema.js";
import { Router } from "express";

const unitRouter = Router();

unitRouter.post("/", async (req, res) => {
    try {
        const unit = new unitSchema(req.body);
        await unit.save();

    } catch {
        res.status(500).send("Internal Server Error!");
    }
});

export default unitRouter;