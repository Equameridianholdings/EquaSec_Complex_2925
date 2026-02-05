import complexSchema from "#db/complexSchema.js";
import { Router } from "express";

const complexRouter = Router();

complexRouter.post("/", async (req, res) => {
    try {
        const complex = new complexSchema(req.body);
        await complex.save();
        res.status(201).json(complex);
    } catch {
        res.status(500).send("Internal Server Error!");
    }
});

export default complexRouter;