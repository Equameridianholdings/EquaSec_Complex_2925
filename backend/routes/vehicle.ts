import vehicleSchema from "#db/vehicleSchema.js";
import { vehicleBodyValidation, vehicleDTO } from "#interfaces/vehicleDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import validateObjectId from "#utils/validateObjectId.js";
import userSchema from "#db/userSchema.js";
import { Router } from "express";
import { Request, Response } from "express";
import { checkSchema } from "express-validator/lib/middlewares/schema.js";
import { ObjectId } from "mongodb";

const vehicleRouter = Router();

vehicleRouter.use(AuthMiddleware);

vehicleRouter.get("/", async (req, res) => {
  try {
    const vehicles = await vehicleSchema.find({});

    if (vehicles.length === 0) {
      res.status(200).json([]);
      return;
    }

    res.status(200).json(vehicles);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

vehicleRouter.get("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

  const vehicleQuery = {
    "user._id": new ObjectId(_id),
  };

  try {
    const vehicles = await vehicleSchema.find(vehicleQuery);

    if (vehicles.length === 0) {
      res.status(200).json([]);
      return;
    }

    res.status(200).json(vehicles);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

vehicleRouter.post("/", checkSchema(vehicleBodyValidation), validateSchema, async (req: Request, res: Response) => {
  const authReq = req as Request & { userEmail?: string };
  const userEmail = authReq.userEmail;
  const user = userEmail ? await userSchema.findOne({ emailAddress: userEmail }) : null;

  if (!user) {
    res.status(401).json("Access Denied!");
    return;
  }

  const vehicle = req.body as vehicleDTO;
  try {
    const newVehicle = new vehicleSchema(vehicle);
    await newVehicle.save();

    res.status(201).json({ message: "Vehicle successfully added!", payload: newVehicle });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

vehicleRouter.patch("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

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

vehicleRouter.delete("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

  try {
    const deletedVehicle = await vehicleSchema.findByIdAndDelete(new ObjectId(_id));

    if (deletedVehicle === null) {
      res.status(404).json({ message: "Vehicle does not exist!" });
      return;
    }

    res.status(200).json({ message: "Vehicle successfully deleted", payload: deletedVehicle });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

export default vehicleRouter;
