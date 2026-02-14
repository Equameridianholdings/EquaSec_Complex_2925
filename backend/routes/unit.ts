
import unitSchema from "#db/unitSchema.js";
import { unitDTO } from "#interfaces/unitDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import isValidObjectID from "#utils/isValidObjectID.js";
import { Router } from "express";

const unitRouter = Router();

unitRouter.use(AuthMiddleware);

unitRouter.post("/", async (req, res) => {
    try {
        const unit = req.body as unitDTO;

        const allUnitsQuery = {
            "complex._id": unit.complex._id
        }
        const allUnits = await unitSchema.find(allUnitsQuery);

        if (allUnits.find(x => x.number == unit.number)) {
            res.status(400).json({ message: "Invalid Operation. Unit already exists."});
            return;
        }

        const newUnit = new unitSchema(unit);
        await newUnit.save();
        res.status(201).json({ message: "Unit added!"})
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error!"});
        return;
    }
});

unitRouter.get("/:complex", async (req, res) => {
    try {
        const complexName = req.params.complex;
        
        const unitsQuery = {
            "complex.name": complexName,
        }
        const units = await unitSchema.find(unitsQuery);

        if (units.length == 0) {
            res.status(404).json({ message: "No units found"});
            return;
        }

        res.status(200).json(units);
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error!"});
        return;
    }
});

unitRouter.patch("/", async (req, res) => {
    try {
        const unit = req.body as unitDTO;

        if (!isValidObjectID(unit._id as unknown as string)) {
            res.status(400).json({ message: "Invalid request! Invalid ID."});
            return;
        }

        const updatedUnit = await unitSchema.findByIdAndUpdate(unit._id, {$set: unit}, {new: true});

        if (!updatedUnit) {
            res.status(404).json({ message: 'Unit not found' });
            return;
        }

        res.status(200).json({ message: "Unit successfully updated!", payload: updatedUnit});
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error!"});
        return;
    }
})

unitRouter.delete("/", async (req, res) => {
    try {
        const unit = req.body as unitDTO;

        if (!isValidObjectID(unit._id as unknown as string)) {
            res.status(400).json({ message: "Invalid request! Invalid ID."});
            return;
        }

        const deletedUnit = await unitSchema.findByIdAndDelete(unit._id);

        if (!deletedUnit) {
            res.status(404).json({ message: 'Unit not found' });
            return;
        }

        res.status(200).json({ message: "Unit successfully deleted!", payload: deletedUnit});
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error!"});
        return;
    }
})

export default unitRouter;