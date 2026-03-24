import complexSchema from "#db/complexSchema.js";
import gatedCommunitySchema from "#db/gatedCommunity.js";
import logSchema from "#db/logsSchema.js";
import unitSchema from "#db/unitSchema.js";
import userSchema from "#db/userSchema.js";
import visitorShema from "#db/visitorSchema.js";
import { gatedCommunityDTO } from "#interfaces/gatedCommunityDTO.js";
import { unitDTO } from "#interfaces/unitDTO.js";
import { UserDTO } from "#interfaces/userDTO.js";
import { visitorBodyValidation, visitorDTO } from "#interfaces/visitorDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import Code_Generator from "#utils/code_generator.js";
import { Request, Response, Router } from "express";
import { ObjectId } from "mongodb";

const visitorRouter = Router();

interface UnitLookupRecord {
  complex?: Record<string, unknown>;
  gatedCommunity?: Record<string, unknown>;
  number?: number | string;
  users?: unknown[];
}

visitorRouter.use(AuthMiddleware);

const toIdString = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value).trim();
  }

  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  if (typeof value === "object" && value !== null && "toHexString" in value) {
    const objectWithHex = value as { toHexString?: () => unknown };
    if (typeof objectWithHex.toHexString === "function") {
      const normalized = objectWithHex.toHexString();
      return typeof normalized === "string" ? normalized.trim() : "";
    }
  }

  return "";
};

const toTrimmedText = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value).trim();
  }

  return "";
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
};

const toUnknownArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return false;
};

const buildResidenceLookup = async (userIds: string[]) => {
  const normalizedUserIds = Array.from(new Set(userIds.map((value) => value.trim()).filter((value) => value.length > 0)));

  const residenceLookup = new Map<
    string,
    {
      complex: unknown;
      complexId: string;
      gatedCommunity: unknown;
      gatedCommunityId: string;
      houseNumber: string;
      unit: string;
    }
  >();

  if (normalizedUserIds.length === 0) {
    return residenceLookup;
  }

  const userIdVariants: (ObjectId | string)[] = [...normalizedUserIds];
  normalizedUserIds.forEach((id) => {
    if (ObjectId.isValid(id)) {
      userIdVariants.push(new ObjectId(id));
    }
  });

  const units = await unitSchema
    .find({ "users._id": { $in: userIdVariants } })
    .select({ complex: 1, gatedCommunity: 1, number: 1, users: 1 })
    .lean<UnitLookupRecord[]>();

  units.forEach((unit) => {
    const users = toUnknownArray(unit.users);
    const unitNumber = toTrimmedText(unit.number);
    const complex = toRecord(unit.complex);
    const gatedCommunity = toRecord(unit.gatedCommunity);
    const residence = {
      complex: Object.keys(complex).length > 0 ? complex : null,
      complexId: toIdString(complex._id),
      gatedCommunity: Object.keys(gatedCommunity).length > 0 ? gatedCommunity : null,
      gatedCommunityId: toIdString(gatedCommunity._id),
      houseNumber: unitNumber,
      unit: unitNumber,
    };

    users.forEach((userId) => {
      const normalizedUserId = toIdString(userId);
      if (normalizedUserId && !residenceLookup.has(normalizedUserId)) {
        residenceLookup.set(normalizedUserId, residence);
      }
    });
  });

  return residenceLookup;
};

const enrichVisitorResidence = (
  visitor: Record<string, unknown>,
  residenceLookup: Map<
    string,
    {
      complex: unknown;
      complexId: string;
      gatedCommunity: unknown;
      gatedCommunityId: string;
      houseNumber: string;
      unit: string;
    }
  >,
) => {
  const user = toRecord(visitor.user);
  const userId = toIdString(user._id);

  if (!userId) {
    return visitor;
  }

  const residence = residenceLookup.get(userId);
  if (!residence) {
    return visitor;
  }

  return {
    ...visitor,
    user: {
      ...user,
      complex: user.complex ?? residence.complex,
      complexId: toIdString(user.complexId) || residence.complexId,
      gatedCommunity: user.gatedCommunity ?? residence.gatedCommunity,
      gatedCommunityId: toIdString(user.gatedCommunityId) || residence.gatedCommunityId,
      houseNumber: toTrimmedText(user.houseNumber) || residence.houseNumber,
      unit: toTrimmedText(user.unit) || residence.unit,
    },
  };
};

const cleanupExpiredVisitors = async () => {
  const now = new Date();

  await visitorShema
    .updateMany(
      {
        expiry: { $lt: now },
        validity: true,
      },
      {
        $set: { validity: false },
      },
    )
    .exec();

  await visitorShema
    .deleteMany({
      $or: [{ arrivedAt: { $exists: false } }, { arrivedAt: null }],
      expiry: { $lt: now },
    })
    .exec();
};

visitorRouter.get("/security/", async (req, res) => {
  const guardEmail = res.get("email");

  if (!guardEmail) {
    return res.status(400).json({ message: "Bad Request! Invalid request." });
  }

  try {
    await cleanupExpiredVisitors();

    //load visitors based on security guard => complex specific visitors
    const security = await userSchema.findOne<UserDTO>({ emailAddress: guardEmail }).exec();

    if (security == null) {
      res.status(404).json({ message: "Security company not found!" });
      return;
    }

    // Derive complex IDs that belong to the guard's assigned gated communities.
    // Visitor codes for a complex inside a gated community store destination.complex._id
    // but not destination.gatedCommunity._id, so we must include those complex IDs too.
    const communityDerivedComplexIds: string[] = [];
    if (security.assignedCommunities && security.assignedCommunities.length > 0) {
      const communities = await gatedCommunitySchema
        .find<gatedCommunityDTO>({ _id: { $in: security.assignedCommunities } })
        .select({ name: 1 })
        .lean()
        .exec();
      const communityNames = communities.map((c) => c.name).filter(Boolean);
      if (communityNames.length > 0) {
        const linkedComplexes = await complexSchema
          .find({
            $or: communityNames.map((n) => ({
              gatedCommunityName: {
                $options: "i",
                $regex: `^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              },
            })),
          })
          .select({ _id: 1 })
          .lean()
          .exec();
        for (const c of linkedComplexes) {
          communityDerivedComplexIds.push(String(c._id));
        }
      }
    }

    const allComplexIds = [
      ...(security.assignedComplexes ?? []),
      ...communityDerivedComplexIds,
    ];

    const guardVisitorQuery = {
      $or: [
        { "destination.complex._id": { $in: allComplexIds } },
        { "destination.gatedCommunity._id": { $in: security.assignedCommunities ?? [] } },
      ],
      validity: true,
    };
    const filteredVisitors = await visitorShema.find<visitorDTO>(guardVisitorQuery).select({}).exec();

    if (filteredVisitors.length == 0) {
      res.status(404).json({ message: "No visitors today!" });
      return;
    }

    res.status(200).json({ message: "Successfully retrieved visitors", payload: filteredVisitors });
    return;
  } catch (err: unknown) {
    res.status(500).json({ message: `Internal Server Error! ${err as string}` });
    return;
  }
});

visitorRouter.get("/user/", async (req, res) => {
  if (!res.get("email")) return res.status(400).json({ message: "Bad Request! Invalid request." });

  const email = res.get("email") as unknown as string;

  try {
    await cleanupExpiredVisitors();

    const userUnits = await userSchema.findOne({ emailAddress: email }).select({ _id: 1, emailAddress: 1 }).lean();
    const userUnitsId = toIdString(userUnits?._id);

    const userIdVariants: (ObjectId | string)[] = [];
    if (userUnitsId) {
      userIdVariants.push(userUnitsId);
      if (ObjectId.isValid(userUnitsId)) {
        userIdVariants.push(new ObjectId(userUnitsId));
      }
    }

    const visitorQuery = userUnitsId
      ? {
          $or: [{ "destination.users._id": { $in: userIdVariants } }, { "destination.users.emailAddress": email }],
        }
      : { "destination.users.emailAddress": email };
    const plainVisitors = await visitorShema.find(visitorQuery).select({}).lean<Record<string, unknown>[]>().exec();
    const userIds = plainVisitors.map((visitor) => toIdString(toRecord(visitor.user)._id)).filter((value) => value.length > 0);
    const residenceLookup = await buildResidenceLookup(userIds);
    const enrichedVisitors = plainVisitors.map((visitor) => enrichVisitorResidence(visitor, residenceLookup));

    if (enrichedVisitors.length == 0) {
      res.status(200).json({ message: "No visitors today!", payload: [] });
      return;
    }

    res.status(200).json({ message: "Successfully loaded visitors", payload: enrichedVisitors });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

visitorRouter.post("/security/", visitorBodyValidation, validateSchema, async (req: Request, res: Response) => {
  try {
    const email = res.get("email");
    const body = req.body as visitorDTO;
    
    const getUser = (await userSchema.findOne({ emailAddress: body.destination?.users[0].emailAddress }).exec()) as unknown as UserDTO;
    const security = (await userSchema.findOne({ emailAddress: email }).exec()) as unknown as UserDTO;
    const _id = getUser._id as unknown as ObjectId;

    const userUnits = await unitSchema.findOne<unitDTO>({ users: _id.toString() }).exec();

    if (userUnits === null) {
      res.status(404).json({ message: "User not found!" });
      return;
    }

    userUnits.users = [getUser] as unknown[] as UserDTO[];

    const incomingVehicle = toRecord(body.vehicle);
    const hasIncomingVehicle = Object.keys(incomingVehicle).length > 0;
    const makeModelParts = toTrimmedText(incomingVehicle.makeModel).trim().split(" ").filter(Boolean);
    const normalizedVehicle = hasIncomingVehicle
      ? {
          color: toTrimmedText(incomingVehicle.color) || toTrimmedText(incomingVehicle.colour),
          make: toTrimmedText(incomingVehicle.make) || makeModelParts[0] || "",
          model: toTrimmedText(incomingVehicle.model) || (makeModelParts.length > 1 ? makeModelParts.slice(1).join(" ") : ""),
          registrationNumber:
            toTrimmedText(incomingVehicle.registrationNumber) ||
            toTrimmedText(incomingVehicle.registerationNumber) ||
            toTrimmedText(incomingVehicle.registration),
        }
      : undefined;

    const visitor: visitorDTO = {
      access: true,
      bookedAt: new Date(),
      code: undefined,
      contact: toTrimmedText(body.contact),
      destination: userUnits,
      driving: toBoolean(body.driving),
      expiry: new Date(new Date().setHours(new Date().getHours() + 24)),
      name: toTrimmedText(body.name),
      surname: toTrimmedText(body.surname),
      validity: false,
      vehicle: normalizedVehicle,
    };
    //Add Id number encryptions

    const newVisitor = new visitorShema(visitor);
    await newVisitor.save();

    const log = new logSchema({ date: new Date(), guard: security, visitor: newVisitor });
    await log.save();

    res.status(201).json({ message: "Visitor successfully added!", payload: newVisitor });
    return;
  } catch (err: unknown) {
    res.status(500).json({ message: `Internal Server Error! ${err as string}` });
  }
});

visitorRouter.post("/", visitorBodyValidation, validateSchema, async (req: Request, res: Response) => {
  try {
    const body = req.body as visitorDTO;
    const email = res.get("email");
    const getUser = (await userSchema.findOne({ emailAddress: email }).exec()) as unknown as UserDTO;

    if (getUser.visitorsTokens <= 0) return res.status(403).json({ message: "Can not book visitor! Free trail expired or you have not renewed subscription!" });

    const _id = getUser._id as unknown as ObjectId;

    const userUnits = await unitSchema.findOne<unitDTO>({ users: _id.toString() }).exec();

    if (userUnits === null) {
      res.status(404).json({ message: "User not found!" });
      return;
    }

    userUnits.users = [getUser] as unknown[] as UserDTO[];

    const actorTypes = Array.isArray(userUnits.users[0].type) ? userUnits.users[0].type : [];
    const normalizedActorTypes = actorTypes.map((value) => toTrimmedText(value).toLowerCase()).filter((value) => value.length > 0);
    const isSecurityBooking = normalizedActorTypes.some((value) => value.includes("security") || value.includes("guard"));

    const incomingVehicle = toRecord(body.vehicle);
    const hasIncomingVehicle = Object.keys(incomingVehicle).length > 0;
    const makeModelParts = toTrimmedText(incomingVehicle.makeModel).trim().split(" ").filter(Boolean);
    const normalizedVehicle = hasIncomingVehicle
      ? {
          color: toTrimmedText(incomingVehicle.color) || toTrimmedText(incomingVehicle.colour),
          make: toTrimmedText(incomingVehicle.make) || makeModelParts[0] || "",
          model: toTrimmedText(incomingVehicle.model) || (makeModelParts.length > 1 ? makeModelParts.slice(1).join(" ") : ""),
          registrationNumber:
            toTrimmedText(incomingVehicle.registrationNumber) ||
            toTrimmedText(incomingVehicle.registerationNumber) ||
            toTrimmedText(incomingVehicle.registration),
        }
      : undefined;

    const visitor: visitorDTO = {
      access: isSecurityBooking ? false : true,
      bookedAt: new Date(),
      code: isSecurityBooking ? undefined : Code_Generator(),
      contact: toTrimmedText(body.contact),
      destination: userUnits,
      driving: toBoolean(body.driving),
      expiry: new Date(new Date().setHours(new Date().getHours() + 24)),
      name: toTrimmedText(body.name),
      surname: toTrimmedText(body.surname),
      validity: isSecurityBooking ? false : true,
      vehicle: normalizedVehicle,
    };

    //Add Id number encryptions

    const newVisitor = new visitorShema(visitor);
    await newVisitor.save();

    await userSchema.findOneAndUpdate({ emailAddress: getUser.emailAddress}, {$set: { visitorsTokens: getUser.visitorsTokens - 1 }}).exec();    
    res.status(201).json({ message: "Visitor successfully added!", payload: newVisitor });
    return;
  } catch (err: unknown) {
    res.status(500).json({ message: `Internal Server Error! ${err as string}` });
  }
});

visitorRouter.patch("/grant", async (req, res) => {
  try {
    // Access Granted or Denied Logic
    const email = res.get("email");

    const visitor = req.body as visitorDTO;
    const visitorRecord = toRecord(req.body);
    const visitorId = toIdString(visitorRecord._id) || toIdString(visitorRecord.id);

    await cleanupExpiredVisitors();

    const securityQuery = { emailAddress: email };
    const security = await userSchema.findOne<UserDTO>(securityQuery).exec();

    if (security === null) {
      res.status(404).json({ message: "Security company not found!" });
      return;
    }

    const persistedBeforeUpdate = await visitorShema.findById<visitorDTO>(new ObjectId(visitorId)).exec();

    if (!persistedBeforeUpdate) {
      res.status(404).json({ message: "Visitor not found!" });
      return;
    }

    const persistedExpiry = persistedBeforeUpdate.expiry ? new Date(persistedBeforeUpdate.expiry) : null;
    if (persistedExpiry && persistedExpiry < new Date()) {
      await visitorShema.findByIdAndUpdate(new ObjectId(visitorId), { validity: false }, { returnDocument: "after" }).exec();

      if (!persistedBeforeUpdate.arrivedAt) {
        await visitorShema.findByIdAndDelete(new ObjectId(visitorId)).exec();
      }

      res.status(400).json({ message: "Bad Request! Visitation expired." });
      return;
    }

    const nextValidity = false;
    const nextAccess = true;

    visitor.validity = nextValidity;
    visitor.access = nextAccess;

    const updatePayload = {
      access: nextAccess,
      arrivedAt: new Date(),
      validity: nextValidity,
    };

    const persistedVisitor = await visitorShema
      .findByIdAndUpdate<visitorDTO>(new ObjectId(visitorId), updatePayload, { returnDocument: "after" })
      .exec();

    if (!persistedVisitor) {
      res.status(404).json({ message: "Visitor not found!" });
      return;
    }

    const log = new logSchema({ date: new Date(), guard: security, visitor: persistedVisitor });
    await log.save();

    res.status(200).json({ message: "Access Granted!", payload: persistedVisitor });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

export default visitorRouter;
