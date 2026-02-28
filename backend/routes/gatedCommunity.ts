import complexSchema from "#db/complexSchema.js";
import gatedCommunitySchema from "#db/gatedCommunity.js";
import securityCompanySchema from "#db/securityCompanySchema.js";
import unitSchema from "#db/unitSchema.js";
import { gatedCommunityBodyValidation, gatedCommunityDTO } from "#interfaces/gatedCommunityDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import validateObjectId from "#utils/validateObjectId.js";
import { Request, Response, Router } from "express";
import { checkSchema } from "express-validator/lib/middlewares/schema.js";
import { ObjectId } from "mongodb";

const gatedCommunityRouter = Router();

interface ExistingCommunityUnit {
  _id?: unknown;
  gatedCommunity?: {
    _id?: string;
    name?: string;
  };
  number?: unknown;
  save: () => Promise<unknown>;
  users?: unknown;
}

interface GatedCommunityLike {
  _id?: unknown;
  name?: string;
  numberOfHouses?: unknown;
}

const toObjectIdString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof ObjectId) {
    return value.toHexString();
  }
  return "";
};

const getRouteId = (value: string | string[]): string => (Array.isArray(value) ? (value[0] ?? "") : value);

const syncUnitsForGatedCommunity = async (gatedCommunity: GatedCommunityLike): Promise<void> => {
  if (!gatedCommunity._id) {
    return;
  }

  const gatedCommunityId = toObjectIdString(gatedCommunity._id);
  if (!gatedCommunityId) {
    return;
  }
  const gatedCommunityIdVariants: (ObjectId | string)[] = [gatedCommunityId];
  if (ObjectId.isValid(gatedCommunityId)) {
    gatedCommunityIdVariants.push(new ObjectId(gatedCommunityId));
  }

  const name = (gatedCommunity.name ?? "").trim();
  const numberOfHouses = Number(gatedCommunity.numberOfHouses);
  const targetCount = Number.isFinite(numberOfHouses) && numberOfHouses > 0 ? Math.floor(numberOfHouses) : 0;

  const existingUnits = await unitSchema
    .find({
      "gatedCommunity._id": { $in: gatedCommunityIdVariants },
    })
    .exec();

  const existingByNumber = new Map<number, ExistingCommunityUnit>();
  for (const unit of existingUnits) {
    const candidate = unit as ExistingCommunityUnit;
    const unitNumber = Number(candidate.number);
    if (Number.isFinite(unitNumber)) {
      existingByNumber.set(unitNumber, candidate);
    }
  }

  const createDocs: {
    complex: null;
    gatedCommunity: { _id: string; name: string };
    number: number;
    numberOfParkingBays: number;
    users: unknown[];
  }[] = [];
  for (let unitNumber = 1; unitNumber <= targetCount; unitNumber++) {
    const existing = existingByNumber.get(unitNumber);
    if (!existing) {
      createDocs.push({
        complex: null,
        gatedCommunity: {
          _id: gatedCommunityId,
          name,
        },
        number: unitNumber,
        numberOfParkingBays: 0,
        users: [],
      });
      continue;
    }

    const currentName = (existing.gatedCommunity?.name ?? "").trim();
    if (currentName !== name) {
      existing.gatedCommunity = {
        _id: gatedCommunityId,
        name,
      };
      await existing.save();
    }
  }

  if (createDocs.length > 0) {
    await unitSchema.insertMany(createDocs);
  }

  const removableUnitIds = existingUnits
    .filter((unit) => {
      const candidate = unit as ExistingCommunityUnit;
      const unitNumber = Number(candidate.number);
      const users = Array.isArray(candidate.users) ? candidate.users : [];
      return Number.isFinite(unitNumber) && unitNumber > targetCount && users.length === 0;
    })
    .map((unit) => (unit as ExistingCommunityUnit)._id)
    .filter((id): id is unknown => id !== undefined);

  if (removableUnitIds.length > 0) {
    await unitSchema.deleteMany({ _id: { $in: removableUnitIds } });
  }
};

gatedCommunityRouter.use(AuthMiddleware);

gatedCommunityRouter.post("/", checkSchema(gatedCommunityBodyValidation), validateSchema, async (req: Request, res: Response) => {
  try {
    const requestBody = req.body as Partial<gatedCommunityDTO> & { unitEnd?: unknown; unitStart?: unknown };
    const gatedCommunity = requestBody as gatedCommunityDTO;
    delete requestBody.unitStart;
    delete requestBody.unitEnd;

    console.log("[gatedCommunity] create request", {
      name: gatedCommunity.name,
      numberOfComplexes: gatedCommunity.numberOfComplexes,
      numberOfHouses: gatedCommunity.numberOfHouses,
    });
    const gatedCommunityQuery = {
      name: gatedCommunity.name,
    };
    const gatedCommunities = await gatedCommunitySchema.findOne(gatedCommunityQuery).exec();

    if (gatedCommunities !== null) {
      res.status(400).json({ message: "Bad Request! Gated Community already exists!" });
      return;
    }

    const newGatedCommunity = new gatedCommunitySchema(requestBody);
    await newGatedCommunity.save();
    await syncUnitsForGatedCommunity(newGatedCommunity);
    console.log("[gatedCommunity] created", { id: newGatedCommunity._id, name: newGatedCommunity.name });

    res.status(201).json({ message: "Gated Community added successfully!", payload: newGatedCommunity });
    return;
  } catch (error) {
    console.error("[gatedCommunity] create failed", error);
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

gatedCommunityRouter.get("/:id", validateObjectId, async (req: Request, res: Response) => {
  const _id = new ObjectId(getRouteId(req.params.id));

  try {
    const gatedCommunity = await gatedCommunitySchema.findById(_id).exec();

    if (gatedCommunity === null) {
      res.status(404).json({ message: "Gated Community not found!" });
      return;
    }

    res.status(200).json(gatedCommunity);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

gatedCommunityRouter.get("/", async (req: Request, res: Response) => {
  try {
    const gatedCommunities = await gatedCommunitySchema.find({}).select({}).exec();

    if (gatedCommunities.length === 0) {
      res.status(200).json([]);
      return;
    }

    res.status(200).json(gatedCommunities);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

gatedCommunityRouter.patch("/:id", validateObjectId, async (req: Request, res: Response) => {
  const body = req.body as Partial<gatedCommunityDTO> & { unitEnd?: unknown; unitStart?: unknown };
  delete body.unitStart;
  delete body.unitEnd;

  const gatedCommunityQuery = {
    $set: body as object,
  };
  const _id = new ObjectId(getRouteId(req.params.id));

  try {
    console.log("[gatedCommunity] update request", { body, id: _id });
    const existingGatedCommunity = await gatedCommunitySchema.findById(_id).exec();
    if (existingGatedCommunity === null) {
      res.status(404).json({ message: "Gated Community does not exist!" });
      return;
    }

    const updatedGatedCommunity = await gatedCommunitySchema.findOneAndUpdate({ _id }, gatedCommunityQuery, { new: true }).exec();

    if (updatedGatedCommunity === null) {
      res.status(404).json({ message: "Gated Community does not exist!" });
      return;
    }

    await syncUnitsForGatedCommunity(updatedGatedCommunity);

    const previousName = existingGatedCommunity.name;
    const nextName = typeof body.name === "string" ? body.name : previousName;
    if (previousName !== nextName) {
      await complexSchema.updateMany({ gatedCommunityName: previousName }, { $set: { gatedCommunityName: nextName } });
      await securityCompanySchema.updateMany(
        { "contract.gatedCommunityName": previousName },
        { $set: { "contract.$[elem].gatedCommunityName": nextName } },
        { arrayFilters: [{ "elem.gatedCommunityName": previousName }] },
      );
    }

    console.log("[gatedCommunity] updated", { id: _id, name: nextName });

    res.status(200).json({ message: "Gated Community successfully updated!" });
    return;
  } catch (error) {
    console.error("[gatedCommunity] update failed", error);
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

gatedCommunityRouter.delete("/:id", validateObjectId, async (req: Request, res: Response) => {
  const _id = new ObjectId(getRouteId(req.params.id));

  try {
    console.log("[gatedCommunity] delete request", { id: _id });
    const deletedGatedCommunity = await gatedCommunitySchema.findByIdAndDelete(_id).exec();

    if (deletedGatedCommunity === null) {
      res.status(404).json({ message: "Gated Community does not exist!" });
      return;
    }

    const gatedName = deletedGatedCommunity.name;
    if (gatedName) {
      await complexSchema.deleteMany({ gatedCommunityName: gatedName });
      await unitSchema.deleteMany({ "gatedCommunity._id": { $in: [String(deletedGatedCommunity._id), deletedGatedCommunity._id] } });
      await securityCompanySchema.updateMany(
        { "contract.gatedCommunityName": gatedName },
        { $pull: { contract: { gatedCommunityName: gatedName } } },
      );
    }

    console.log("[gatedCommunity] deleted", { id: _id, name: gatedName });

    res.status(200).json({ message: "Gated Community successfully deleted!" });
    return;
  } catch (error) {
    console.error("[gatedCommunity] delete failed", error);
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

export default gatedCommunityRouter;
