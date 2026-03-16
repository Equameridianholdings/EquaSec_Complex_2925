import complexSchema from "#db/complexSchema.js";
import gatedCommunitySchema from "#db/gatedCommunity.js";
import securityCompanySchema from "#db/securityCompanySchema.js";
import unitSchema from "#db/unitSchema.js";
import { gatedCommunityBodyValidation, gatedCommunityDTO } from "#interfaces/gatedCommunityDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import { ValidObjectId } from "#utils/validObjectId.js";
import { Request, Response, Router } from "express";
import { checkSchema } from "express-validator/lib/middlewares/schema.js";
import { ObjectId } from "mongodb";

const gatedCommunityRouter = Router();

const getMongoDebug = (error: unknown): null | {
  code?: number;
  keyPattern?: Record<string, number>;
  keyValue?: Record<string, unknown>;
  message?: string;
} => {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const mongoError = error as {
    code?: number;
    keyPattern?: Record<string, number>;
    keyValue?: Record<string, unknown>;
    message?: string;
  };

  return {
    code: mongoError.code,
    keyPattern: mongoError.keyPattern,
    keyValue: mongoError.keyValue,
    message: mongoError.message,
  };
};

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
    house: true;
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
        house: true,
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

    res.status(201).json({ message: "Gated Community added successfully!", payload: newGatedCommunity });
    return;
  } catch (error) {
    const debug = getMongoDebug(error);
    console.error("[gatedCommunity] create failed", {
      debug,
      requestBody: req.body as unknown,
    });
    res.status(500).json({
      debug,
      message: "Internal Server Error! Unable to create gated community.",
    });
    return;
  }
});

gatedCommunityRouter.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const gatedCommunity = await gatedCommunitySchema.findById(ValidObjectId(id as string)).exec();

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
      res.status(200).json({message: "No gated communities", payload: []});
      return;
    }

    res.status(200).json({ message: "Retrieved communities", payload: gatedCommunities });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

gatedCommunityRouter.patch("/:id", async (req: Request, res: Response) => {
  const body = req.body as Partial<gatedCommunityDTO> & { unitEnd?: unknown; unitStart?: unknown };
  delete body.unitStart;
  delete body.unitEnd;

  const gatedCommunityQuery = {
    $set: body as object,
  };
  const { id } = req.params;

  try {
    const existingGatedCommunity = await gatedCommunitySchema.findById(ValidObjectId(id as string)).exec();
    if (existingGatedCommunity === null) {
      res.status(404).json({ message: "Gated Community does not exist!" });
      return;
    }

    const updatedGatedCommunity = await gatedCommunitySchema.findOneAndUpdate(ValidObjectId(id as string), gatedCommunityQuery, { new: true }).exec();

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

    console.log("[gatedCommunity] updated", { id: ValidObjectId(id as string), name: nextName });

    res.status(200).json({ message: "Gated Community successfully updated!" });
    return;
  } catch (error) {
    const debug = getMongoDebug(error);
    console.error("[gatedCommunity] update failed", {
      body,
      debug,
      id: ValidObjectId(id as string),
    });
    res.status(500).json({
      debug,
      message: "Internal Server Error. Unable to update gated community.",
    });
    return;
  }
});

gatedCommunityRouter.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const deletedGatedCommunity = await gatedCommunitySchema.findByIdAndDelete(ValidObjectId(id as string)).exec();

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

    res.status(200).json({ message: "Gated Community successfully deleted!" });
    return;
  } catch (error: unknown) {
    res.status(500).json({ message: `Internal Server Error ${error as string}` });
    return;
  }
});

export default gatedCommunityRouter;
