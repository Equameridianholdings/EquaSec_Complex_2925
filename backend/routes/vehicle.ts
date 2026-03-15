import unitSchema from "#db/unitSchema.js";
import userSchema from "#db/userSchema.js";
import vehicleSchema from "#db/vehicleSchema.js";
import { unitDTO } from "#interfaces/unitDTO.js";
import { vehicleBodyValidation, vehicleDTO } from "#interfaces/vehicleDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import RoleMiddleware from "#middleware/role.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import validateUser from "#utils/validateUser.js";
import { ValidObjectId } from "#utils/validObjectId.js";
import { Router } from "express";
import { Request, Response } from "express";
import { checkSchema } from "express-validator/lib/middlewares/schema.js";
import { ObjectId } from "mongodb";

const vehicleRouter = Router();

vehicleRouter.use(AuthMiddleware);

vehicleRouter.get("/", RoleMiddleware(["security", "manager", "admin"]), async (req, res) => {
  try {
    const vehicles = await vehicleSchema.find({});

    if (vehicles.length === 0) {
      res.status(200).json({ message: "No vehichles found", payload: [] });
      return;
    }

    res.status(200).json({ message: "Successfully loaded vehichles", payload: vehicles });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

vehicleRouter.get("/user/", RoleMiddleware(["tenant"]), async (req, res) => {
  try {
    const email = res.get("email");

    const user = await userSchema.findOne({ emailAddress: email }).exec();
    
    const units = await unitSchema
      .find({ "users._id": user?._id.toString() })
      .select({})
      .exec() as unknown as unitDTO[];
    
    const allVehicles: vehicleDTO[] = await vehicleSchema.find({}).select({}).exec() as unknown as vehicleDTO[];

    let vehicles: unknown[] = [];

    units.forEach((unit) => {
      unit.users.forEach((usr: unknown) => {
        const temp = allVehicles.filter((x) => x.user?._id === usr as ObjectId | undefined);
        vehicles = [...vehicles, ...temp];
      });
    });

    if (vehicles.length === 0) {
      res.status(404).json({ message: "No vehichles found", payload: [] });
      return;
    }

    res.status(200).json({ message: "Successfully loaded vehichles", payload: vehicles });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

vehicleRouter.post("/", RoleMiddleware(["admin", "security", "manager"]), checkSchema(vehicleBodyValidation), validateSchema, async (req: Request, res: Response) => {
  try {
    const user = await validateUser(req.get("email") as unknown as string);

    if (!user) return res.status(401).json("Access Denied!");

    const vehicle = req.body as vehicleDTO;

    const newVehicle = new vehicleSchema(vehicle);
    await newVehicle.save();

    res.status(201).json({ message: "Vehicle successfully added!", payload: newVehicle });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

vehicleRouter.patch("/:id", RoleMiddleware(["admin", "security", "manager"]), async (req: Request, res: Response) => {
  const { id } = req.params;

  const vehicleQuery = {
    $set: req.body as object,
  };
  try {
    const updatedVehicle = await vehicleSchema.findByIdAndUpdate(ValidObjectId(id as string), vehicleQuery, { new: true }).exec();

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

vehicleRouter.delete("/:id", RoleMiddleware(["admin", "security", "manager"]), async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const deletedVehicle = await vehicleSchema.findByIdAndDelete(ValidObjectId(id as string)).exec();

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
