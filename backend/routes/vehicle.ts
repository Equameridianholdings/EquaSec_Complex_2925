import vehicleSchema from "#db/vehicleSchema.js";
import { vehicleDTO } from "#interfaces/vehicleDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import isValidObjectID from "#utils/isValidObjectID.js";
import { Router } from "express";
import { ObjectId } from "mongodb";

const vehicleRouter = Router();

vehicleRouter.use(AuthMiddleware);

vehicleRouter.get("/", async (req, res) => {
    try {
        const vehicles = await vehicleSchema.find({});

        if (vehicles.length === 0) {
            res.status(404).json({ message: "No Vehicles found!" });
            return;
        }

        res.status(200).json(vehicles);
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
});

vehicleRouter.get("/:id", async (req, res) => {
    const _id = req.params.id;
    if (!isValidObjectID(_id)) {
        res.status(400).json({ message: "Bad request! Invalid Id." });
        return;
    }

    const vehicleQuery = {
        "user._id": new ObjectId(_id),
    };

    try {
        const vehicles = await vehicleSchema.find(vehicleQuery);

        if (vehicles.length === 0) {
            res.status(404).json({ message: "No Vehicles found!" });
            return;
        }

        res.status(200).json(vehicles);
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
});

vehicleRouter.post("/", async (req, res) => {
    const vehicle = req.body as vehicleDTO;
    try {
        const newVehicle = new vehicleSchema(vehicle);
        await newVehicle.save();

        res.status(201).json({ message: "Vehicle successfully added!", payload: newVehicle });
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

vehicleRouter.patch("/:id", async (req, res) => {
    const _id = req.params.id;
    if (!isValidObjectID(_id)) {
        res.status(400).json({ message: "Bad request! Invalid Id." });
        return;
    }

    const vehicleQuery = {
        $set: req.body as object,
    };
    try {
        const updatedVehicle = await vehicleSchema.findByIdAndUpdate(new ObjectId(_id), vehicleQuery, { new: true });

        if (updatedVehicle === null) {
            res.status(404).json({ message: "Vehicle does not exist!" });
            return;
        }

        res.status(200).json({ message: "Vehicle successfully updated!", payload: updatedVehicle });
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
});

vehicleRouter.delete("/:id", async (req, res) => {
    const _id = req.params.id;
    if (!isValidObjectID(_id)) {
        res.status(400).json({ message: "Bad request! Invalid Id." });
        return;
    }

    try {
        const deletedVehicle = await vehicleSchema.findByIdAndDelete(new ObjectId(_id));

        if (deletedVehicle === null) {
            res.status(404).json({ message: "Vehicle does not exist!" });
            return;
        }

        res.status(200).json({ message: "Vehicle successfully deleted", payload: deletedVehicle });
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

export default vehicleRouter;