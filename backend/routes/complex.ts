import complexSchema from "#db/complexSchema.js";
import gatedCommunitySchema from "#db/gatedCommunity.js";
import securityCompanySchema from "#db/securityCompanySchema.js";
import unitSchema from "#db/unitSchema.js";
import { complexBodyValidation, complexDTO } from "#interfaces/complexDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import { ValidObjectId } from "#utils/validObjectId.js";
import { Router } from "express";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";

const complexRouter = Router();

interface BlockLike {
  name?: unknown;
  numberOfUnits?: unknown;
}

interface ComplexLike {
  _id?: unknown;
  address?: string;
  blocks?: BlockLike[] | null;
  fixedParkingCount?: unknown;
  gatedCommunityName?: null | string;
  name?: string;
  numberOfUnits?: unknown;
  parkingIsUnlimited?: boolean;
  parkingMode?: string;
}

interface ComplexRequestBody extends Omit<Partial<complexDTO>, "blocks" | "unitParkingConfig"> {
  blocks?: BlockLike[];
  unitEnd?: unknown;
  unitParkingConfig?: unknown;
  unitStart?: unknown;
}

interface ExistingUnitLike {
  number?: unknown;
  numberOfParkingBays?: unknown;
}

interface NormalizedBlock {
  name: string;
  numberOfUnits: number;
}

interface UnitParkingEntry {
  parkingBays?: unknown;
  unitNumber?: unknown;
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

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const getUnitNumbersFromComplex = (complex: ComplexLike): number[] => {
  const blocks = Array.isArray(complex.blocks) ? complex.blocks : [];

  if (blocks.length > 0) {
    const values: number[] = [];
    let nextUnitNumber = 1;
    for (const block of blocks) {
      const count = Number(block.numberOfUnits);
      if (!Number.isFinite(count) || count <= 0) {
        continue;
      }
      const end = nextUnitNumber + count - 1;
      for (let value = nextUnitNumber; value <= end; value++) {
        values.push(value);
      }
      nextUnitNumber = end + 1;
    }
    return values;
  }

  const count = Number(complex.numberOfUnits);
  if (!Number.isFinite(count) || count <= 0) {
    return [];
  }

  const values: number[] = [];
  for (let value = 1; value <= count; value++) {
    values.push(value);
  }
  return values;
};

const createPerUnitParkingMap = (value: unknown): Map<number, number> => {
  const map = new Map<number, number>();
  const config = Array.isArray(value) ? value : [];

  for (const entry of config) {
    const candidate: UnitParkingEntry = entry && typeof entry === "object" ? (entry as UnitParkingEntry) : {};
    const unitNumber = Number(candidate.unitNumber);
    const parkingBays = Number(candidate.parkingBays);
    if (!Number.isFinite(unitNumber) || unitNumber <= 0) {
      continue;
    }
    if (!Number.isFinite(parkingBays) || parkingBays < 0) {
      continue;
    }
    map.set(unitNumber, parkingBays);
  }

  return map;
};

const getParkingBaysForUnit = (
  complex: ComplexLike,
  unitNumber: number,
  payloadPerUnitParking: Map<number, number>,
  existingPerUnitParking: Map<number, number>,
): number => {
  const mode = (complex.parkingMode ?? "").toLowerCase();
  if (mode === "per-unit") {
    if (payloadPerUnitParking.has(unitNumber)) {
      return payloadPerUnitParking.get(unitNumber) ?? 0;
    }
    if (existingPerUnitParking.has(unitNumber)) {
      return existingPerUnitParking.get(unitNumber) ?? 0;
    }
    return 0;
  }

  if (complex.parkingIsUnlimited) {
    return 0;
  }

  const fixed = Number(complex.fixedParkingCount);
  return Number.isFinite(fixed) && fixed >= 0 ? fixed : 0;
};

const syncUnitsForComplex = async (complex: ComplexLike, unitParkingConfig?: unknown): Promise<void> => {
  if (!complex._id) {
    return;
  }

  const complexId = toObjectIdString(complex._id);
  if (!complexId) {
    return;
  }
  const payloadPerUnitParking = createPerUnitParkingMap(unitParkingConfig);
  const existingUnits = await unitSchema
    .find({ "complex?._id": { $in: [complexId, complex._id] } })
    .select({ number: 1, numberOfParkingBays: 1 })
    .lean();

  const existingPerUnitParking = new Map<number, number>();
  for (const existingUnit of existingUnits) {
    const candidate = existingUnit as ExistingUnitLike;
    const number = Number(candidate.number);
    const numberOfParkingBays = Number(candidate.numberOfParkingBays);
    if (!Number.isFinite(number) || number <= 0) {
      continue;
    }
    if (!Number.isFinite(numberOfParkingBays) || numberOfParkingBays < 0) {
      continue;
    }
    existingPerUnitParking.set(number, numberOfParkingBays);
  }

  await unitSchema.deleteMany({ "complex?._id": { $in: [complexId, complex._id] } });

  const unitNumbers = getUnitNumbersFromComplex(complex);
  if (unitNumbers.length === 0) {
    return;
  }

  const docs = unitNumbers.map((unitNumber) => ({
    complex: {
      _id: complexId,
      address: complex.address ?? "",
      name: complex.name ?? "",
    },
    number: unitNumber,
    numberOfParkingBays: getParkingBaysForUnit(complex, unitNumber, payloadPerUnitParking, existingPerUnitParking),
    users: [],
  }));

  await unitSchema.insertMany(docs);
};

const syncGatedCommunityComplexCount = async (gatedCommunityName: string): Promise<void> => {
  const normalized = gatedCommunityName.trim();
  if (!normalized) {
    return;
  }

  const count = await complexSchema.countDocuments({ gatedCommunityName: normalized });
  await gatedCommunitySchema.updateOne({ name: normalized }, { $set: { numberOfComplexes: count } });
};

complexRouter.use(AuthMiddleware);

complexRouter.post("/", complexBodyValidation, validateSchema, async (req: Request, res: Response) => {
  try {
    const requestBody = req.body as ComplexRequestBody;
    const complex = requestBody as complexDTO;

    const rawBlocks: BlockLike[] = Array.isArray(requestBody.blocks) ? requestBody.blocks : [];
    if (rawBlocks.length > 0) {
      const normalizedBlocks: NormalizedBlock[] = rawBlocks
        .map((block) => {
          const name = asString(block.name).trim();
          const countFromPayload = Number(block.numberOfUnits);

          const normalizedCount = Number.isFinite(countFromPayload) && countFromPayload > 0 ? countFromPayload : 0;
          return { name, numberOfUnits: normalizedCount };
        })
        .filter((block) => block.name.length > 0 && Number.isFinite(block.numberOfUnits) && block.numberOfUnits > 0);

      if (normalizedBlocks.length > 0) {
        const numberOfUnits = normalizedBlocks.reduce((total: number, block: NormalizedBlock) => total + block.numberOfUnits, 0);

        requestBody.blocks = normalizedBlocks;
        requestBody.numberOfUnits = numberOfUnits;
      }
    }

    const unitParkingConfig = requestBody.unitParkingConfig;

    delete requestBody.unitStart;
    delete requestBody.unitEnd;
    delete requestBody.unitParkingConfig;

    const gatedCommunityName = typeof complex.gatedCommunityName === "string" ? complex.gatedCommunityName.trim() : "";
    if (gatedCommunityName) {
      complex.gatedCommunityName = gatedCommunityName;
      requestBody.gatedCommunityName = gatedCommunityName;
    }
    const complexQuery = {
      name: complex.name,
    };
    const complexes = await complexSchema.findOne(complexQuery);

    if (complexes !== null) {
      res.status(400).json({ message: "Bad Request! Complex already exists!" });
      return;
    }

    let gatedCommunity = null;
    if (gatedCommunityName) {
      gatedCommunity = await gatedCommunitySchema.findOne({ name: gatedCommunityName });
      if (gatedCommunity === null) {
        res.status(400).json({ message: "Bad Request! Gated Community not found." });
        return;
      }
    }

    const newComplex = new complexSchema(requestBody);
    await newComplex.save();
    await syncUnitsForComplex(newComplex, unitParkingConfig);

    if (gatedCommunity) {
      await syncGatedCommunityComplexCount(gatedCommunity.name);
    }

    res.status(201).json({ message: "Complex added successfully!", payload: newComplex });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

complexRouter.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const complex = await complexSchema.findById(ValidObjectId(id as string)).select("-unitParkingConfig");

    if (complex === null) {
      res.status(404).json({ message: "Complex not found!" });
      return;
    }

    const complexName = complex.name;
    if (complexName) {
      await securityCompanySchema.updateMany(
        { $or: [{ "contract.complex.name": complexName }, { "contract.complexName": complexName }] },
        { $pull: { contract: { $or: [{ "complex.name": complexName }, { complexName: complexName }] } } },
      );
    }

    res.status(200).json(complex);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

complexRouter.get("/", async (req: Request, res: Response) => {
  try {
    const complexes = await complexSchema.find({}).select("-unitParkingConfig").exec();

    if (complexes.length === 0) {
      res.status(200).json([]);
      return;
    }

    res.status(200).json({ message: "Retrieved all complexes.", payload: complexes });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

complexRouter.patch("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const patchBody = req.body as ComplexRequestBody;
    const existingComplex = await complexSchema.findById(ValidObjectId(id as string)).exec();
    if (existingComplex === null) {
      res.status(404).json({ message: "Complex does not exist!" });
      return;
    }

    const previousGatedCommunityName = (existingComplex.gatedCommunityName ?? "").trim();

    if (Object.prototype.hasOwnProperty.call(patchBody, "gatedCommunityName")) {
      const requestedCommunityName = typeof patchBody.gatedCommunityName === "string" ? patchBody.gatedCommunityName.trim() : "";

      if (requestedCommunityName) {
        const targetCommunity = await gatedCommunitySchema.findOne({ name: requestedCommunityName });
        if (targetCommunity === null) {
          res.status(400).json({ message: "Bad Request! Gated Community not found." });
          return;
        }
        patchBody.gatedCommunityName = requestedCommunityName;
      } else {
        patchBody.gatedCommunityName = "";
      }
    }

    if (Array.isArray(patchBody.blocks)) {
      const normalizedBlocks: NormalizedBlock[] = patchBody.blocks
        .map((block) => ({
          name: asString(block.name).trim(),
          numberOfUnits: Number(block.numberOfUnits),
        }))
        .filter((block) => block.name.length > 0 && Number.isFinite(block.numberOfUnits) && block.numberOfUnits > 0);

      patchBody.blocks = normalizedBlocks;

      if (normalizedBlocks.length > 0) {
        patchBody.numberOfUnits = normalizedBlocks.reduce((total: number, block: NormalizedBlock) => total + block.numberOfUnits, 0);
      }
    }

    delete patchBody.unitStart;
    delete patchBody.unitEnd;
    const unitParkingConfig = patchBody.unitParkingConfig;
    delete patchBody.unitParkingConfig;

    const complexQuery = {
      $set: patchBody as object,
    };

    const updatedComplex = await complexSchema.findOneAndUpdate(ValidObjectId(id as string), complexQuery, { new: true }).exec();

    if (updatedComplex === null) {
      res.status(404).json({ message: "Complex does not exist!" });
      return;
    }

    await syncUnitsForComplex(updatedComplex, unitParkingConfig);

    const nextGatedCommunityName = (updatedComplex.gatedCommunityName ?? "").trim();
    if (previousGatedCommunityName !== nextGatedCommunityName) {
      await syncGatedCommunityComplexCount(previousGatedCommunityName);
      await syncGatedCommunityComplexCount(nextGatedCommunityName);
    } else if (nextGatedCommunityName) {
      await syncGatedCommunityComplexCount(nextGatedCommunityName);
    }

    res.status(200).json({ message: "Complex successfully updated!" });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

complexRouter.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const deletedComplex = await complexSchema.findByIdAndDelete(ValidObjectId(id as string)).exec();

    if (deletedComplex === null) {
      res.status(404).json({ message: "Complex does not exist!" });
      return;
    }

    await unitSchema.deleteMany({ "complex?._id": { $in: [id, id] } });
    await syncGatedCommunityComplexCount(deletedComplex.gatedCommunityName ?? "");

    res.status(200).json({ message: "Complex successfully deleted!" });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

export default complexRouter;
