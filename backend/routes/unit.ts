import unitSchema from "#db/unitSchema.js";
import { unitBodyValidation, unitDTO } from "#interfaces/unitDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import validateObjectId from "#utils/validateObjectId.js";
import { Router } from "express";
import { ObjectId } from "mongodb";

const unitRouter = Router();

unitRouter.use(AuthMiddleware);

unitRouter.post("/", async (req, res) => {
  const validated = await unitBodyValidation.run(req);
  if (validated.length > 0) return res.status(400).json({ message: "Invalid details", payload: validated });

  try {
    const unit = req.body as unitDTO;

    const hasComplex = Boolean(unit?.complex?._id);
    const hasGatedCommunity = Boolean(unit?.gatedCommunity?._id);
    if (!hasComplex && !hasGatedCommunity) {
      res.status(400).json({ message: "Invalid details. Unit must link to a complex or gated community." });
      return;
    }

    const allUnitsQuery = hasComplex
      ? { "complex._id": new ObjectId(String(unit.complex?._id)) }
      : { "gatedCommunity._id": new ObjectId(String(unit.gatedCommunity?._id)) };
    const allUnits = await unitSchema.find(allUnitsQuery);

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

unitRouter.get("/:complex", async (req, res) => {
  try {
    const stationName = req.params.complex;

    const unitsQuery = {
      $or: [
        { "complex.name": stationName },
        { "gatedCommunity.name": stationName },
      ],
    };
    const units = await unitSchema.find(unitsQuery);

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

unitRouter.patch("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

  const unitQuery = {
    $set: req.body as object,
  }
  try {
    const updatedUnit = await unitSchema.findByIdAndUpdate(_id, unitQuery, { new: true });

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

unitRouter.delete("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;
  try {
    const deletedUnit = await unitSchema.findByIdAndDelete(_id);

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
