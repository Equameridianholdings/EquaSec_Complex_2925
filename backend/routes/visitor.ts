import logSchema from "#db/logsSchema.js";
import unitSchema from "#db/unitSchema.js";
import userSchema from "#db/userSchema.js";
import visitorShema from "#db/visitorSchema.js";
import { UserDTO } from "#interfaces/userDTO.js";
import { visitorBodyValidation, visitorDTO } from "#interfaces/visitorDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import Code_Generator from "#utils/code_generator.js";
import validateObjectId from "#utils/validateObjectId.js";
import { ValidObjectId } from "#utils/validObjectId.js";
import { Request, Response, Router } from "express";
import { ObjectId } from "mongodb";
import { isValidObjectId } from "mongoose";

const visitorRouter = Router();

type UnitLookupRecord = {
  complex?: Record<string, unknown>;
  gatedCommunity?: Record<string, unknown>;
  number?: number | string;
  users?: unknown[];
};

visitorRouter.use(AuthMiddleware);

const toIdString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (value instanceof ObjectId) {
    return value.toString();
  }

  if (typeof value === "object" && value !== null && "toString" in value) {
    const converted = String((value as { toString: () => string }).toString());
    return converted === "[object Object]" ? "" : converted.trim();
  }

  return String(value).trim();
};

const buildResidenceLookup = async (userIds: string[]) => {
  const normalizedUserIds = Array.from(
    new Set(
      userIds
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );

  const residenceLookup = new Map<string, {
    complex: unknown;
    complexId: string;
    gatedCommunity: unknown;
    gatedCommunityId: string;
    houseNumber: string;
    unit: string;
  }>();

  if (normalizedUserIds.length === 0) {
    return residenceLookup;
  }

  const userIdVariants: Array<ObjectId | string> = [...normalizedUserIds];
  normalizedUserIds.forEach((id) => {
    if (ObjectId.isValid(id)) {
      userIdVariants.push(new ObjectId(id));
    }
  });

  const units = await unitSchema
    .find({ users: { $in: userIdVariants } })
    .select({ complex: 1, gatedCommunity: 1, number: 1, users: 1 })
    .lean<UnitLookupRecord[]>();

  units.forEach((unit) => {
    const users = Array.isArray(unit?.users) ? unit.users : [];
    const unitNumber = unit?.number === undefined || unit?.number === null ? "" : String(unit.number);
    const complex = (unit?.complex ?? null) as Record<string, unknown> | null;
    const gatedCommunity = (unit?.gatedCommunity ?? null) as Record<string, unknown> | null;
    const residence = {
      complex,
      complexId: toIdString(complex?._id),
      gatedCommunity,
      gatedCommunityId: toIdString(gatedCommunity?._id),
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
  residenceLookup: Map<string, {
    complex: unknown;
    complexId: string;
    gatedCommunity: unknown;
    gatedCommunityId: string;
    houseNumber: string;
    unit: string;
  }>,
) => {
  const user = ((visitor?.user ?? {}) as Record<string, unknown>);
  const userId = toIdString(user?._id);

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
      complex: user?.complex ?? residence.complex,
      complexId: toIdString(user?.complexId) || residence.complexId,
      gatedCommunity: user?.gatedCommunity ?? residence.gatedCommunity,
      gatedCommunityId: toIdString(user?.gatedCommunityId) || residence.gatedCommunityId,
      houseNumber: String(user?.houseNumber ?? "").trim() || residence.houseNumber,
      unit: String(user?.unit ?? "").trim() || residence.unit,
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
      expiry: { $lt: now },
      $or: [{ arrivedAt: { $exists: false } }, { arrivedAt: null }],
    })
    .exec();
};

visitorRouter.get("/security/", validateObjectId, async (req, res) => {
  const guardId = req.get("id");
  if (!guardId) {
    console.log('[GET /visitor/security] Missing id header');
    return res.status(400).json({ message: "Bad Request! Invalid request." });
  }

  const _id = ValidObjectId(guardId as unknown as string);

  try {
    await cleanupExpiredVisitors();

    //load visitors based on security guard => complex specific visitors
    const security = await userSchema.findById<UserDTO>(_id);
    // console.log('[GET /visitor/security] Guard ID:', guardId);
    // console.log('[GET /visitor/security] Security user:', security);

    if (security == null) {
      console.log('[GET /visitor/security] Security company not found for ID:', guardId);
      res.status(404).json({ message: "Security company not found!" });
      return;
    }

    const guardComplexIds = new Set<string>(
      [
        toIdString(security.complex?._id),
        toIdString((security as unknown as Record<string, unknown>)?.complexId),
        ...(Array.isArray((security as unknown as Record<string, unknown>)?.assignedComplexes)
          ? ((security as unknown as Record<string, unknown>).assignedComplexes as unknown[]).map((value) => toIdString(value))
          : []),
      ].filter((value) => value.length > 0),
    );

    const guardCommunityIds = new Set<string>(
      [
        toIdString(security.gatedCommunity?._id),
        toIdString((security as unknown as Record<string, unknown>)?.communityId),
        ...(Array.isArray((security as unknown as Record<string, unknown>)?.assignedCommunities)
          ? ((security as unknown as Record<string, unknown>).assignedCommunities as unknown[]).map((value) => toIdString(value))
          : []),
      ].filter((value) => value.length > 0),
    );

    const plainVisitors = await visitorShema.find({}).lean<Record<string, unknown>[]>().exec();
    const userIds = plainVisitors
      .map((visitor) => toIdString((visitor.user as Record<string, unknown> | undefined)?._id))
      .filter((value) => value.length > 0);
    const residenceLookup = await buildResidenceLookup(userIds);
    const enrichedVisitors = plainVisitors.map((visitor) => enrichVisitorResidence(visitor, residenceLookup));
    const filteredVisitors = enrichedVisitors.filter((visitor) => {
      const visitorUser = (visitor.user ?? {}) as Record<string, unknown>;
      const visitorComplexId = toIdString(visitorUser.complexId) || toIdString((visitorUser.complex as Record<string, unknown> | undefined)?._id);
      const visitorCommunityId =
        toIdString(visitorUser.gatedCommunityId) ||
        toIdString((visitorUser.gatedCommunity as Record<string, unknown> | undefined)?._id);

      const inComplex = visitorComplexId.length > 0 && guardComplexIds.has(visitorComplexId);
      const inCommunity = visitorCommunityId.length > 0 && guardCommunityIds.has(visitorCommunityId);
      return inComplex || inCommunity;
    });

    console.log('[GET /visitor/security] Visitors found:', filteredVisitors.length);
    // Log each visitor vehicle for debugging registration/color fields
    filteredVisitors.forEach((v, idx) => {
      if (v.vehicle) {
        console.log(`[GET /visitor/security] Visitor #${idx} vehicle:`, v.vehicle);
      }
    });

    if (filteredVisitors.length == 0) {
      console.log('[GET /visitor/security] No visitors found for the guard station assignments');
      res.status(404).json({ message: "No visitors today!" });
      return;
    }

    res.status(200).json(filteredVisitors);
    return;
  } catch (err) {
    console.log('[GET /visitor/security] Error:', err);
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

visitorRouter.get("/user/", async (req, res) => {
  if (!res.get("email")) return res.status(400).json({ message: "Bad Request! Invalid request." });

  const email = res.get("email") as unknown as string;

  try {
    await cleanupExpiredVisitors();

    const loggedInUser = await userSchema.findOne({ emailAddress: email }).select({ _id: 1, emailAddress: 1 }).lean();
    const loggedInUserId = toIdString(loggedInUser?._id);

    const userIdVariants: Array<ObjectId | string> = [];
    if (loggedInUserId) {
      userIdVariants.push(loggedInUserId);
      if (ObjectId.isValid(loggedInUserId)) {
        userIdVariants.push(new ObjectId(loggedInUserId));
      }
    }

    const visitorQuery = loggedInUserId
      ? {
          $or: [
            { "user._id": { $in: userIdVariants } },
            { "user.emailAddress": email },
          ],
        }
      : { "user.emailAddress": email };
    const plainVisitors = await visitorShema
      .find(visitorQuery)
      .select({})
      .lean<Record<string, unknown>[]>()
      .exec();
    const userIds = plainVisitors
      .map((visitor) => toIdString((visitor.user as Record<string, unknown> | undefined)?._id))
      .filter((value) => value.length > 0);
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

visitorRouter.post("/", visitorBodyValidation, validateSchema, async (req: Request, res: Response) => {
  try {

    const loggedInUser: UserDTO = (await userSchema.findOne({ emailAddress: res.get("email") }).exec()) as unknown as UserDTO;

    // Logging incoming request for debugging
    // console.log('[POST /visitor] Incoming body:', req.body);
    // console.log('[POST /visitor] Logged-in user:', loggedInUser);

    // Use req.body.user if present (guard booking for resident), else use logged-in user (tenant self-booking)
    const requestUser = (req.body?.user ?? {}) as Record<string, unknown>;
    const selectedUserId = toIdString(requestUser._id) || toIdString(loggedInUser?._id);

    if (!selectedUserId) {
      res.status(400).json({ message: "Bad Request! User id is required." });
      return;
    }

    const userToAssign = {
      _id: selectedUserId,
      cellNumber: String(requestUser.cellNumber ?? loggedInUser?.cellNumber ?? ""),
      emailAddress: String(requestUser.emailAddress ?? loggedInUser?.emailAddress ?? ""),
      name: String(requestUser.name ?? loggedInUser?.name ?? ""),
      surname: String(requestUser.surname ?? loggedInUser?.surname ?? ""),
    };

    const actorTypes = Array.isArray(loggedInUser?.type) ? loggedInUser.type : [];
    const normalizedActorTypes = actorTypes
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter((value) => value.length > 0);
    const isSecurityBooking = normalizedActorTypes.some(
      (value) => value.includes("security") || value.includes("guard"),
    );

    const incomingVehicle = req.body?.vehicle;
    const makeModelParts = String(incomingVehicle?.makeModel ?? "")
      .trim()
      .split(" ")
      .filter(Boolean);
    const normalizedVehicle = incomingVehicle
      ? {
          color: incomingVehicle.color ?? incomingVehicle.colour ?? "",
          make: incomingVehicle.make ?? makeModelParts[0] ?? "",
          model:
            incomingVehicle.model ??
            (makeModelParts.length > 1 ? makeModelParts.slice(1).join(" ") : ""),
          registrationNumber:
            incomingVehicle.registrationNumber ??
            incomingVehicle.registerationNumber ??
            incomingVehicle.registration ??
            "",
        }
      : undefined;

    const visitor: visitorDTO = {
      ...(req.body as visitorDTO),
      code: isSecurityBooking ? undefined : Code_Generator(),
      expiry: new Date(new Date().setHours(new Date().getHours() + 24)),
      user: userToAssign as unknown as UserDTO,
      validity: isSecurityBooking ? false : true,
      bookedAt: new Date(),
      vehicle: normalizedVehicle,
    };

    //Add Id number encryptions

    const newVisitor = new visitorShema(visitor);
    await newVisitor.save();
    console.log('[POST /visitor] Visitor saved:', newVisitor);
    res.status(201).json({ message: "Visitor successfully added!", payload: newVisitor });
    return;
  } catch (err) {
    console.error('[POST /visitor] Error:', err);
    res.status(500).json("Internal Server Error!");
  }
});

visitorRouter.patch("/grant/:id/:access", async (req, res) => {
  try {
    // Access Granted or Denied Logic
    const { access, id } = req.params;

    const visitor: visitorDTO = req.body as visitorDTO;
    const visitorId = String((visitor as any)?._id ?? (visitor as any)?.id ?? '').trim();

    await cleanupExpiredVisitors();

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Bad Request! Invalid Onject id" });
      return;
    }

    if (!visitorId || !isValidObjectId(visitorId)) {
      res.status(400).json({ message: "Bad Request! Invalid visitor id" });
      return;
    }

    const objectId = new ObjectId(id);
    const securityQuery = { _id: objectId };
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
      await visitorShema
        .findByIdAndUpdate(new ObjectId(visitorId), { validity: false }, { new: false })
        .exec();

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
      validity: nextValidity,
      access: nextAccess,
      arrivedAt: new Date(),
    };

    const persistedVisitor = await visitorShema.findByIdAndUpdate<visitorDTO>(
      new ObjectId(visitorId),
      updatePayload,
      { new: true }
    ).exec();

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
