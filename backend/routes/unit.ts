import unitSchema from "#db/unitSchema.js";
import userSchema from "#db/userSchema.js";
import { unitBodyValidation, unitDTO } from "#interfaces/unitDTO.js";
import { UserDTO } from "#interfaces/userDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import { ValidObjectId } from "#utils/validObjectId.js";
import { Request, Response, Router } from "express";
import { ObjectId } from "mongodb";
import { isValidObjectId } from "mongoose";

const unitRouter = Router();

unitRouter.use(AuthMiddleware);

unitRouter.post("/", unitBodyValidation, validateSchema, async (req: Request, res: Response) => {
  try {
    const unit = req.body as unitDTO;

    const hasComplex = Boolean(unit.complex?._id);
    const hasGatedCommunity = Boolean(unit.gatedCommunity?._id);
    if (!hasComplex && !hasGatedCommunity) {
      res.status(400).json({ message: "Invalid details. Unit must link to a complex or gated community." });
      return;
    }

    const allUnitsQuery = hasComplex
      ? { "complex._id": new ObjectId(String(unit.complex?._id)) }
      : { "gatedCommunity._id": new ObjectId(String(unit.gatedCommunity?._id)) };
    const allUnits = await unitSchema.find(allUnitsQuery).select({}).exec();

    if (allUnits.find((x) => x.number == unit.number)) {
      res.status(400).json({ message: "Invalid Operation. Unit already exists." });
      return;
    }

    const newUnit = new unitSchema(unit);
    await newUnit.save();
    res.status(201).json({ message: "Unit added!" });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

unitRouter.get("/", async (req: Request, res: Response) => {
  try {
    const units = await unitSchema.find({}).select({}).exec();
    res.status(200).json(units);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

unitRouter.get("/complex/:name", async (req, res) => {
  try {
    const stationName = req.params.name;

    const unitsQuery = {
      $or: [{ "complex.name": stationName }, { "gatedCommunity.name": stationName }],
    };
    const units = await unitSchema.find(unitsQuery).select({}).exec();

    if (units.length == 0) {
      res.status(404).json({ message: "No units found" });
      return;
    }

    res.status(200).json(units);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

unitRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;

  const unitQuery = {
    $set: req.body as object,
  };
  try {
    const updatedUnit = await unitSchema.findByIdAndUpdate(ValidObjectId(id), unitQuery, { new: true }).exec();

    if (!updatedUnit) {
      res.status(404).json({ message: "Unit not found" });
      return;
    }

    res.status(200).json({ message: "Unit successfully updated!", payload: updatedUnit });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

unitRouter.get("/user/", async (req, res) => {
  const emailAddress = res.get("email");

  const userQuery = {
    emailAddress: emailAddress,
  };
  try {
    const user = await userSchema.findOne(userQuery).exec();
    
    if (!user) {
      res.status(404).json({ message: "Unit not found" });
      return;
    }
    
    const unitQuery = {
      "users": user._id.toString(),
    };

    const Unit = await unitSchema.findOne(unitQuery).exec();

    if (!Unit) {
      res.status(404).json({ message: "Unit not found" });
      return;
    }
    
    const users = await userSchema.find({}).select({}).exec() as unknown as UserDTO[];

    for (let i = 0; i < Unit.users.length; i++) {
      if (isValidObjectId(Unit.users[i]))
        Unit.users[i] = users.find((x) => ValidObjectId(x._id as unknown as string).toString() === Unit.users[i]);
    }
    
    res.status(200).json({ message: "Unit successfully found!", payload: Unit });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

unitRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedUnit = await unitSchema.findByIdAndDelete(ValidObjectId(id)).exec();

    if (!deletedUnit) {
      res.status(404).json({ message: "Unit not found" });
      return;
    }

    res.status(200).json({ message: "Unit successfully deleted!", payload: deletedUnit });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

export default unitRouter;
