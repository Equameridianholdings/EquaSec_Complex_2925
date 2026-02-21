import userSchema from "#db/userSchema.js";
import residentSchema from "#db/residentSchema.js";
import securityCompanySchema from "#db/securityCompanySchema.js";
import complexSchema from "#db/complexSchema.js";
import gatedCommunitySchema from "#db/gatedCommunity.js";
import unitSchema from "#db/unitSchema.js";
import vehicleSchema from "#db/vehicleSchema.js";
import { complexDTO } from "#interfaces/complexDTO.js";
import { userBodyValidation, UserDTO } from "#interfaces/userDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import { sendSecurityCompanyCode } from "#utils/sendEmail.js";
// import { encrypt } from "#utils/encryption.js";
import GenerateJWT from "#utils/generateJWT.js";
import VerifyToken from "#utils/verifyToken.js";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { Router } from "express";
import { checkSchema, Schema } from "express-validator/lib/middlewares/schema.js";
import { body } from "express-validator/lib/middlewares/validation-chain-builders.js";
import { ObjectId } from "mongodb";
import { isKeyObject } from "util/types";

const userRouter = Router();

const getRequestIdParam = (req: Request): string => {
  const id = req.params.id;
  if (Array.isArray(id)) {
    return id[0] ?? "";
  }
  return id ?? "";
};

const resolveSecurityCompanyForUser = async (user: { emailAddress: string; securityCompany?: UserDTO["securityCompany"] | null }) => {
  const linkedCompanyId = user?.securityCompany?._id;

  if (linkedCompanyId) {
    const companyById = await securityCompanySchema.findById(linkedCompanyId).lean();
    if (companyById) {
      return companyById;
    }
  }

  const companyByManagerEmail = await securityCompanySchema.findOne({ managerEmail: user.emailAddress }).lean();
  return companyByManagerEmail;
};

const normalizeStringList = (values: unknown): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .filter((value) => typeof value === "string" && value.trim().length > 0)
        .map((value) => String(value).trim())
    )
  );
};

const normalizeTenantVehicles = (vehicles: unknown): Array<{ make: string; model: string; reg: string; color?: string }> => {
  if (!Array.isArray(vehicles)) {
    return [];
  }

  return vehicles
    .map((vehicle: any) => ({
      make: String(vehicle?.make ?? "").trim(),
      model: String(vehicle?.model ?? "").trim(),
      reg: String(vehicle?.reg ?? vehicle?.registrationNumber ?? vehicle?.registerationNumber ?? "").trim(),
      color: String(vehicle?.color ?? "").trim() || undefined,
    }))
    .filter((vehicle) => vehicle.make.length > 0 && vehicle.model.length > 0 && vehicle.reg.length > 0);
};

const syncTenantVehiclesForUser = async (
  user: { _id?: unknown; name?: string; surname?: string; emailAddress?: string; cellNumber?: string },
  vehicles: unknown,
): Promise<void> => {
  const userId = String(user?._id ?? "").trim();
  if (!userId) {
    return;
  }

  const userIdVariants: Array<string | ObjectId> = [userId];
  if (ObjectId.isValid(userId)) {
    userIdVariants.push(new ObjectId(userId));
  }

  await vehicleSchema.deleteMany({ "user._id": { $in: userIdVariants } });

  const normalizedVehicles = normalizeTenantVehicles(vehicles);
  if (normalizedVehicles.length === 0) {
    return;
  }

  const linkedUser = {
    _id: userId,
    name: String(user?.name ?? ""),
    surname: String(user?.surname ?? ""),
    emailAddress: String(user?.emailAddress ?? ""),
    cellNumber: String(user?.cellNumber ?? ""),
  };

  const docs = normalizedVehicles.map((vehicle) => ({
    make: vehicle.make,
    model: vehicle.model,
    registerationNumber: vehicle.reg,
    color: vehicle.color,
    year: 0,
    user: linkedUser,
  }));

  await vehicleSchema.insertMany(docs);
};

const resolveResidentForTenantUser = async (user: any): Promise<any | null> => {
  const userId = String(user?._id ?? "");
  if (userId && ObjectId.isValid(userId)) {
    const byUserId = await residentSchema.findOne({ userId: new ObjectId(userId) }).lean();
    if (byUserId) {
      return byUserId;
    }
  }

  const emailAddress = String(user?.emailAddress ?? "").trim();
  if (!emailAddress) {
    return null;
  }

  return await residentSchema.findOne({ emailAddress }).lean();
};

const resolveCompanyIdFromTenantContext = (tenantUser: any, tenantResident: any): string => {
  return String(tenantResident?.securityCompany?._id ?? tenantUser?.securityCompany?._id ?? "");
};

const getCompanyEmployeeAssignments = (company: any): Array<any> => {
  return Array.isArray(company?.employeeAssignments) ? company.employeeAssignments : [];
};

const sanitizeCompanyEmployeeAssignment = (entry: any): any => ({
  userId: String(entry?.userId ?? ""),
  assignedComplexes: normalizeStringList(entry?.assignedComplexes),
  assignedCommunities: normalizeStringList(entry?.assignedCommunities),
  position: entry?.position,
  status: entry?.status,
  contractStartDate: entry?.contractStartDate ?? null,
  contractEndDate: entry?.contractEndDate ?? null,
  createdBy: entry?.createdBy,
});

const findCompanyAssignmentForUser = (company: any, userId: string): any | null => {
  if (!userId) {
    return null;
  }

  const assignments = getCompanyEmployeeAssignments(company);
  const match = assignments.find((item: any) => String(item?.userId ?? "") === String(userId));
  return match ?? null;
};

const resolveUserAssignments = (user: any, company: any): { assignedComplexes: string[]; assignedCommunities: string[] } => {
  const assignment = findCompanyAssignmentForUser(company, String(user?._id ?? ""));

  if (assignment) {
    return {
      assignedComplexes: normalizeStringList(assignment.assignedComplexes),
      assignedCommunities: normalizeStringList(assignment.assignedCommunities),
    };
  }

  return {
    assignedComplexes: normalizeStringList(user?.assignedComplexes),
    assignedCommunities: normalizeStringList(user?.assignedCommunities),
  };
};

const resolveUserEmployeeContracts = (user: any, company: any): Array<any> => {
  const assignment = findCompanyAssignmentForUser(company, String(user?._id ?? ""));

  if (assignment) {
    return [
      {
        securityCompany: {
          _id: user?.securityCompany?._id ?? company?._id ?? "",
          name: user?.securityCompany?.name ?? company?.name ?? "",
        },
        position: assignment?.position ?? "Guard",
        status: assignment?.status ?? (user?.movedOut ? "inactive" : "active"),
        assignedComplexes: normalizeStringList(assignment?.assignedComplexes),
        assignedCommunities: normalizeStringList(assignment?.assignedCommunities),
        contractStartDate: assignment?.contractStartDate ?? null,
        contractEndDate: assignment?.contractEndDate ?? null,
        createdBy: assignment?.createdBy,
      },
    ];
  }

  return Array.isArray(user?.employeeContracts) ? user.employeeContracts : [];
};

const upsertCompanyEmployeeAssignment = async (
  companyId: string,
  assignment: {
    userId: string;
    assignedComplexes?: string[];
    assignedCommunities?: string[];
    position?: string;
    status?: "active" | "inactive";
    contractStartDate?: Date | null;
    contractEndDate?: Date | null;
    createdBy?: string;
  }
): Promise<void> => {
  const userId = String(assignment.userId ?? "").trim();
  if (!companyId || !userId) {
    return;
  }

  const company = await securityCompanySchema.findById(companyId).select({ employeeAssignments: 1 }).lean();
  if (!company) {
    return;
  }

  const assignments = getCompanyEmployeeAssignments(company)
    .filter((item: any) => String(item?.userId ?? "") !== userId)
    .map((item: any) => sanitizeCompanyEmployeeAssignment(item));
  const previous = findCompanyAssignmentForUser(company, userId);

  assignments.push(sanitizeCompanyEmployeeAssignment({
    userId,
    assignedComplexes: normalizeStringList(assignment.assignedComplexes ?? previous?.assignedComplexes),
    assignedCommunities: normalizeStringList(assignment.assignedCommunities ?? previous?.assignedCommunities),
    position: assignment.position ?? previous?.position,
    status: assignment.status ?? previous?.status,
    contractStartDate: assignment.contractStartDate ?? previous?.contractStartDate ?? null,
    contractEndDate: assignment.contractEndDate ?? previous?.contractEndDate ?? null,
    createdBy: assignment.createdBy ?? previous?.createdBy,
  }));

  await securityCompanySchema.updateOne(
    { _id: companyId },
    { $set: { employeeAssignments: assignments } }
  ).exec();
};

const removeCompanyEmployeeAssignment = async (companyId: string, userId: string): Promise<void> => {
  if (!companyId || !userId) {
    return;
  }

  await securityCompanySchema.updateOne(
    { _id: companyId },
    { $pull: { employeeAssignments: { userId: String(userId) } } }
  ).exec();
};

const extractUnitNumber = (address: string): number | null => {
  const match = String(address ?? "").match(/\d+/);
  if (!match) {
    return null;
  }

  const value = Number(match[0]);
  if (Number.isNaN(value)) {
    return null;
  }

  return value;
};

const normalizeName = (value: string | undefined | null): string => {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
};

const findUnitByLocationAndAddress = async (
  location: { complexId?: string; gatedCommunityId?: string },
  address: string,
) => {
  const complexId = String(location?.complexId ?? "").trim();
  const gatedCommunityId = String(location?.gatedCommunityId ?? "").trim();

  if (!complexId && !gatedCommunityId) {
    return null;
  }

  const unitNumber = extractUnitNumber(address);
  if (unitNumber === null) {
    return null;
  }

  if (complexId) {
    const complexIdVariants: Array<string | ObjectId> = [String(complexId)];
    if (ObjectId.isValid(String(complexId))) {
      complexIdVariants.push(new ObjectId(String(complexId)));
    }

    const unit = await unitSchema.findOne({
      number: unitNumber,
      "complex._id": { $in: complexIdVariants },
    }).exec();

    return unit;
  }

  const gatedCommunityIdVariants: Array<string | ObjectId> = [String(gatedCommunityId)];
  if (ObjectId.isValid(String(gatedCommunityId))) {
    gatedCommunityIdVariants.push(new ObjectId(String(gatedCommunityId)));
  }

  const unit = await unitSchema.findOne({
    number: unitNumber,
    "gatedCommunity._id": { $in: gatedCommunityIdVariants },
  }).exec();

  return unit;
};

const linkTenantToUnit = async (
  tenantId: string,
  location: {
    complex?: { _id?: string; name?: string; address?: string } | null;
    gatedCommunity?: { _id?: string; name?: string } | null;
  },
  address: string,
) => {
  const complexId = String(location?.complex?._id ?? "").trim();
  const gatedCommunityId = String(location?.gatedCommunity?._id ?? "").trim();

  let unit = await findUnitByLocationAndAddress(
    {
      complexId,
      gatedCommunityId: complexId ? "" : gatedCommunityId,
    },
    address,
  );

  if (!unit && !complexId && gatedCommunityId) {
    const unitNumber = extractUnitNumber(address);
    if (unitNumber !== null) {
      unit = new unitSchema({
        complex: null,
        gatedCommunity: {
          _id: gatedCommunityId,
          name: String(location?.gatedCommunity?.name ?? ""),
        },
        number: unitNumber,
        numberOfParkingBays: 0,
        users: [],
      });
    }
  }

  if (!unit) {
    return;
  }

  const users = Array.isArray(unit.users) ? unit.users : [];
  const alreadyLinked = users.some((entry: unknown) => String(entry) === String(tenantId));
  if (!alreadyLinked) {
    users.push(tenantId);
  }

  unit.users = users;
  await unit.save();
};

const unlinkTenantFromUnit = async (
  tenantId: string,
  location: { complexId?: string; gatedCommunityId?: string },
  address: string,
) => {
  const unit = await findUnitByLocationAndAddress(location, address);
  if (!unit) {
    return;
  }

  const users = Array.isArray(unit.users) ? unit.users : [];
  const nextUsers = users.filter((entry: unknown) => String(entry) !== String(tenantId));
  unit.users = nextUsers;
  await unit.save();
};

//Register a new user
userRouter.post(
  "/register",
  body("confirmPassword")
    .custom((value, { req }) => {
      const user = req.body as UserDTO;
      return value === user.password as unknown as string;
    })
    .withMessage("Passwords do not match."),
  // body("idNumber")
  //   .custom((value: string) => {
  //     return checkID(value);
  //   })
  //   .withMessage("Invalid Id number!"),
  body("complex")
    .custom((value) => {      
      if (!isKeyObject(value)) return {};

      return value as unknown as complexDTO;
    })
    .withMessage("Invalid object!"),
  checkSchema(userBodyValidation),
  validateSchema,
  async (req: Request, res: Response) => {
    const user: UserDTO = req.body as UserDTO;
    try {
      user.salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(user.password as unknown as string, user.salt);

      user.password = hashPassword;

      // Add Id number encryption logic here
      // user.idNumber = encrypt(user.idNumber);

      const newUser = new userSchema(user);
      await newUser.save();

      return res.status(201).json({ message: "User successfully added!", payload: newUser });
    } catch {
      return res.status(500).json({ message: "Internal Server Error"});
    }
  },
);

//Login a new user
const loginBodyValidation: Schema = {
  emailAddress: {
    errorMessage: "Invalid email address",
    isEmail: true,
    isEmpty: false,
  },
  password: {
    errorMessage: "Field is required",
    isEmpty: false,
    matches: {
      errorMessage: "Password must be exactly 6 digits.",
      options: /^\d{6}$/,
    },
    isLength: {
      errorMessage: "Incorrect password length",
      options: {
        max: 6,
        min: 6,
      },
    },
  },
};

const securityEmployeeBodyValidation: Schema = {
  name: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
  surname: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
  emailAddress: {
    errorMessage: "Invalid email address",
    isEmail: true,
    isEmpty: false,
  },
  cellNumber: {
    errorMessage: "Cell number must be 10 digits and start with 0",
    isEmpty: false,
    matches: {
      options: [/^0\d{9}$/],
    },
  },
  position: {
    errorMessage: "Invalid position",
    isIn: {
      options: [["Guard", "admin-Guard", "admin-guard", "adminGuard", "adminguard"]],
    },
  },
  status: {
    optional: true,
    isIn: {
      options: [["active", "inactive"]],
    },
  },
};

const tenantCreateBodyValidation: Schema = {
  name: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
  surname: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
  emailAddress: {
    errorMessage: "Invalid email address",
    isEmail: true,
    isEmpty: false,
  },
  cellNumber: {
    errorMessage: "Cell number must be 10 digits and start with 0",
    isEmpty: false,
    matches: {
      options: [/^0\d{9}$/],
    },
  },
  address: {
    errorMessage: "Address is required",
    isEmpty: false,
  },
  residenceType: {
    errorMessage: "Invalid residence type",
    isIn: {
      options: [["complex", "community"]],
    },
  },
};

const tenantUpdateBodyValidation: Schema = {
  name: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
  surname: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
  emailAddress: {
    errorMessage: "Invalid email address",
    isEmail: true,
    isEmpty: false,
  },
  cellNumber: {
    errorMessage: "Cell number must be 10 digits and start with 0",
    isEmpty: false,
    matches: {
      options: [/^0\d{9}$/],
    },
  },
  address: {
    errorMessage: "Address is required",
    isEmpty: false,
  },
  residenceType: {
    errorMessage: "Invalid residence type",
    isIn: {
      options: [["complex", "community"]],
    },
  },
};

const securityAssignmentBodyValidation: Schema = {
  assignedComplexes: {
    optional: true,
    isArray: true,
  },
  assignedCommunities: {
    optional: true,
    isArray: true,
  },
};

userRouter.post("/security-employee", AuthMiddleware, checkSchema(securityEmployeeBodyValidation), validateSchema, async (req: Request, res: Response) => {
  try {
    const authReq = req as Request & { userEmail?: string };
    const managerEmail = authReq.userEmail;

    if (!managerEmail) {
      return res.status(401).json({ message: "Access Denied!" });
    }

    const managerUser = await userSchema.findOne<UserDTO>({ emailAddress: managerEmail }).select({}).exec();
    if (!managerUser) {
      return res.status(404).json({ message: "Manager user not found!" });
    }

    const managerRoles = Array.isArray(managerUser.type) ? managerUser.type : [];
    if (!managerRoles.includes("manager")) {
      return res.status(403).json({ message: "Access Forbidden!" });
    }

    const linkedSecurityCompany = await resolveSecurityCompanyForUser(managerUser);
    if (!linkedSecurityCompany) {
      return res.status(400).json({ message: "Manager is not linked to a security company." });
    }

    const body = req.body as {
      name: string;
      surname: string;
      emailAddress: string;
      cellNumber: string;
      position: string;
      status?: "active" | "inactive";
      assignedComplexId?: string;
      assignedComplexName?: string;
      assignedGatedCommunityName?: string;
      contractStartDate?: string;
      contractEndDate?: string;
    };

    const normalizedPosition = (body.position ?? "").toLowerCase().replace(/[^a-z]/g, "");
    const isAdminGuard = normalizedPosition.includes("admin");
    const employeePosition: "Guard" | "admin-Guard" = isAdminGuard ? "admin-Guard" : "Guard";

    const normalizedEmail = body.emailAddress.trim().toLowerCase();
    const existingUser = await userSchema.findOne({ emailAddress: normalizedEmail }).select({ _id: 1 }).lean();
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    const temporaryPin = String(Math.floor(100000 + Math.random() * 900000));
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(temporaryPin, salt);

    const employeeUser = new userSchema({
      cellNumber: body.cellNumber,
      complex: body.assignedComplexId
        ? {
            _id: body.assignedComplexId,
            name: body.assignedComplexName ?? "",
          }
        : null,
      emailAddress: normalizedEmail,
      movedOut: (body.status ?? "active") === "inactive",
      name: body.name,
      surname: body.surname,
      password: hashedPassword,
      salt,
      profilePhoto: "",
      type: isAdminGuard ? ["security", "admin"] : ["security"],
      securityCompany: {
        _id: linkedSecurityCompany._id,
        name: linkedSecurityCompany.name,
      },
    });

    await employeeUser.save();

    const initialAssignedComplexes = body.assignedComplexId ? [String(body.assignedComplexId)] : [];
    const initialAssignedCommunities = body.assignedGatedCommunityName ? [String(body.assignedGatedCommunityName)] : [];

    await upsertCompanyEmployeeAssignment(String(linkedSecurityCompany._id), {
      userId: String(employeeUser._id),
      assignedComplexes: initialAssignedComplexes,
      assignedCommunities: initialAssignedCommunities,
      position: employeePosition,
      status: body.status ?? "active",
      contractStartDate: body.contractStartDate ? new Date(body.contractStartDate) : new Date(),
      contractEndDate: body.contractEndDate ? new Date(body.contractEndDate) : null,
      createdBy: managerEmail,
    });

    try {
      await sendSecurityCompanyCode({
        to: normalizedEmail,
        code: temporaryPin,
        companyName: linkedSecurityCompany.name,
      });
    } catch {
      await removeCompanyEmployeeAssignment(String(linkedSecurityCompany._id), String(employeeUser._id));
      await userSchema.findByIdAndDelete(employeeUser._id);
      return res.status(500).json({ message: "Unable to send employee credentials email." });
    }

    return res.status(201).json({
      message: "Security employee added successfully!",
      payload: {
        user: employeeUser,
        temporaryPin,
        emailSent: true,
      },
    });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

userRouter.post("/tenant", AuthMiddleware, checkSchema(tenantCreateBodyValidation), validateSchema, async (req: Request, res: Response) => {
  try {
    const authReq = req as Request & { userEmail?: string };
    const actorEmail = authReq.userEmail;

    if (!actorEmail) {
      return res.status(401).json({ message: "Access Denied!" });
    }

    const actorUser = await userSchema.findOne<UserDTO>({ emailAddress: actorEmail }).select({}).exec();
    const actorRoles = Array.isArray(actorUser?.type)
      ? actorUser.type.map((role) => normalizeName(String(role ?? "")))
      : [];
    const isManager = actorRoles.includes("manager");
    const isSecurity = actorRoles.includes("security");

    if (!actorUser || (!isManager && !isSecurity)) {
      return res.status(403).json({ message: "Access Forbidden!" });
    }

    const linkedSecurityCompany = await resolveSecurityCompanyForUser(actorUser);

    const body = req.body as {
      name: string;
      surname: string;
      emailAddress: string;
      cellNumber: string;
      idNumber?: string;
      address: string;
      residenceType: "complex" | "community";
      complexId?: string;
      complexName?: string;
      communityId?: string;
      communityResidenceType?: "house" | "complex";
      communityComplexId?: string;
      vehicles?: Array<{ make: string; model: string; reg: string; color?: string }>;
    };

    const normalizedEmail = body.emailAddress.trim().toLowerCase();
    const existingUser = await userSchema.findOne({ emailAddress: normalizedEmail }).select({ _id: 1 }).lean();
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    const existingResident = await residentSchema.findOne({ emailAddress: normalizedEmail }).select({ _id: 1 }).lean();
    if (existingResident) {
      return res.status(409).json({ message: "Resident with this email already exists." });
    }

    const temporaryPin = String(Math.floor(100000 + Math.random() * 900000));
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(temporaryPin, salt);

    const trimmedAddress = body.address.trim();
    let linkedComplex: any = null;
    let linkedGatedCommunity: any = null;
    let communityIdValue = "";
    let communityResidenceTypeValue = "";
    let communityComplexIdValue = "";
    let unitNumberValue = "";
    let houseNumberValue = "";

    if (body.residenceType === "complex") {
      if (!body.complexId || !ObjectId.isValid(body.complexId)) {
        return res.status(400).json({ message: "Valid complex is required for complex residence." });
      }

      linkedComplex = await complexSchema.findById(body.complexId).select({ _id: 1, name: 1, gatedCommunityName: 1 }).lean();
      if (!linkedComplex) {
        return res.status(404).json({ message: "Complex not found." });
      }

      unitNumberValue = trimmedAddress;
    }

    if (body.residenceType === "community") {
      if (!body.communityId || !ObjectId.isValid(body.communityId)) {
        return res.status(400).json({ message: "Valid gated community is required for community residence." });
      }

      linkedGatedCommunity = await gatedCommunitySchema.findById(body.communityId).select({ _id: 1, name: 1 }).lean();
      if (!linkedGatedCommunity) {
        return res.status(404).json({ message: "Gated community not found." });
      }

      communityIdValue = String(linkedGatedCommunity._id);
      communityResidenceTypeValue = body.communityResidenceType ?? "house";

      if (communityResidenceTypeValue === "complex") {
        if (!body.communityComplexId || !ObjectId.isValid(body.communityComplexId)) {
          return res.status(400).json({ message: "Valid gated community complex is required." });
        }

        const communityComplex = await complexSchema.findById(body.communityComplexId).select({ _id: 1, name: 1, gatedCommunityName: 1 }).lean();
        if (!communityComplex) {
          return res.status(404).json({ message: "Community complex not found." });
        }

        const complexCommunityName = String(communityComplex.gatedCommunityName ?? "").trim().toLowerCase();
        const selectedCommunityName = String(linkedGatedCommunity.name ?? "").trim().toLowerCase();
        if (!complexCommunityName || complexCommunityName !== selectedCommunityName) {
          return res.status(400).json({ message: "Selected complex does not belong to the selected gated community." });
        }

        linkedComplex = communityComplex;
        communityComplexIdValue = String(communityComplex._id);
        unitNumberValue = trimmedAddress;
      } else {
        houseNumberValue = trimmedAddress;
      }
    }

    if (isSecurity) {
      const actorAssignments = resolveUserAssignments(actorUser, linkedSecurityCompany);
      const assignedComplexes = actorAssignments.assignedComplexes;
      const assignedCommunitiesRaw = actorAssignments.assignedCommunities;

      const assignedComplexIds = new Set(assignedComplexes);
      const assignedCommunityIds = new Set(assignedCommunitiesRaw.filter((value) => ObjectId.isValid(value)));
      const assignedCommunityNames = new Set(
        assignedCommunitiesRaw
          .filter((value) => !ObjectId.isValid(value))
          .map((value) => normalizeName(value))
          .filter((value) => value.length > 0)
      );

      if (assignedCommunityIds.size > 0) {
        const assignedCommunityDocs = await gatedCommunitySchema
          .find({ _id: { $in: Array.from(assignedCommunityIds).map((id) => new ObjectId(id)) } })
          .select({ _id: 1, name: 1 })
          .lean();

        for (const community of assignedCommunityDocs) {
          const normalizedCommunityName = normalizeName(String(community?.name ?? ""));
          if (normalizedCommunityName) {
            assignedCommunityNames.add(normalizedCommunityName);
          }
        }
      }

      const linkedComplexId = String(linkedComplex?._id ?? "");
      const linkedCommunityId = String(linkedGatedCommunity?._id ?? "");
      const linkedCommunityName = normalizeName(String(linkedGatedCommunity?.name ?? linkedComplex?.gatedCommunityName ?? ""));

      const hasComplexScope = linkedComplexId.length > 0 && assignedComplexIds.has(linkedComplexId);
      const hasCommunityScope =
        (linkedCommunityId.length > 0 && assignedCommunityIds.has(linkedCommunityId)) ||
        (linkedCommunityName.length > 0 && assignedCommunityNames.has(linkedCommunityName));

      const hasScopeAccess = body.residenceType === "complex"
        ? (hasComplexScope || hasCommunityScope)
        : hasCommunityScope;

      if (!hasScopeAccess) {
        return res.status(403).json({ message: "Access Forbidden! You can only register tenants within your assigned station scope." });
      }
    }

    const resident = new residentSchema({
      name: body.name.trim(),
      surname: body.surname.trim(),
      emailAddress: normalizedEmail,
      cellNumber: body.cellNumber.trim(),
      idNumber: body.idNumber?.trim() || undefined,
      residenceType: body.residenceType,
      complex: linkedComplex
        ? {
            _id: linkedComplex._id,
            name: linkedComplex.name ?? "",
            gatedCommunityName: linkedComplex.gatedCommunityName ?? "",
          }
        : null,
      gatedCommunity: linkedGatedCommunity
        ? {
            _id: linkedGatedCommunity._id,
            name: linkedGatedCommunity.name ?? "",
          }
        : null,
      communityId: communityIdValue,
      communityResidenceType: communityResidenceTypeValue,
      communityComplexId: communityComplexIdValue,
      unitNumber: unitNumberValue,
      houseNumber: houseNumberValue,
      address: trimmedAddress,
      vehicles: [],
      securityCompany: linkedSecurityCompany
        ? {
            _id: linkedSecurityCompany._id,
            name: linkedSecurityCompany.name,
          }
        : null,
      createdBy: actorEmail,
    });

    try {
      await resident.save();
    } catch {
      return res.status(500).json({ message: "Unable to save tenant in residents collection." });
    }

    const tenantUser = new userSchema({
      cellNumber: body.cellNumber.trim(),
      emailAddress: normalizedEmail,
      idNumber: body.idNumber?.trim() || undefined,
      movedOut: false,
      name: body.name.trim(),
      surname: body.surname.trim(),
      password: hashedPassword,
      salt,
      profilePhoto: "",
      type: ["tenant"],
    });

    try {
      await tenantUser.save();
    } catch {
      await residentSchema.findByIdAndDelete(resident._id);
      return res.status(500).json({ message: "Unable to save tenant user." });
    }

    try {
      await residentSchema.findByIdAndUpdate(resident._id, { userId: tenantUser._id });
    } catch {
      await userSchema.findByIdAndDelete(tenantUser._id);
      await residentSchema.findByIdAndDelete(resident._id);
      return res.status(500).json({ message: "Unable to link tenant user to resident." });
    }

    try {
      await syncTenantVehiclesForUser(
        {
          _id: tenantUser._id,
          name: tenantUser.name,
          surname: tenantUser.surname,
          emailAddress: tenantUser.emailAddress,
          cellNumber: tenantUser.cellNumber,
        },
        body.vehicles,
      );
    } catch {
      await userSchema.findByIdAndDelete(tenantUser._id);
      await residentSchema.findByIdAndDelete(resident._id);
      return res.status(500).json({ message: "Unable to sync tenant vehicles." });
    }

    try {
      const usesUnit =
        body.residenceType === "complex" ||
        body.residenceType === "community";
      if (usesUnit) {
        await linkTenantToUnit(
          String(tenantUser._id ?? ""),
          {
            complex: linkedComplex
              ? {
                  _id: String(linkedComplex._id ?? ""),
                  name: String(linkedComplex.name ?? ""),
                  address: String(linkedComplex.address ?? ""),
                }
              : null,
            gatedCommunity: linkedGatedCommunity
              ? {
                  _id: String(linkedGatedCommunity._id ?? ""),
                  name: String(linkedGatedCommunity.name ?? ""),
                }
              : null,
          },
          trimmedAddress,
        );
      }
    } catch {
      await vehicleSchema.deleteMany({ "user._id": { $in: [String(tenantUser._id ?? ""), tenantUser._id] } });
      await userSchema.findByIdAndDelete(tenantUser._id);
      await residentSchema.findByIdAndDelete(resident._id);
      return res.status(500).json({ message: "Unable to link tenant to unit." });
    }

    try {
      await sendSecurityCompanyCode({
        to: normalizedEmail,
        code: temporaryPin,
        companyName: linkedSecurityCompany?.name,
      });
    } catch {
      await vehicleSchema.deleteMany({ "user._id": { $in: [String(tenantUser._id ?? ""), tenantUser._id] } });
      await userSchema.findByIdAndDelete(tenantUser._id);
      await residentSchema.findByIdAndDelete(resident._id);
      return res.status(500).json({ message: "Unable to send tenant credentials email." });
    }

    return res.status(201).json({
      message: "Tenant registered successfully!",
      payload: {
        user: tenantUser,
        resident,
        temporaryPin,
        emailSent: true,
      },
    });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

userRouter.patch("/tenant/:id", AuthMiddleware, checkSchema(tenantUpdateBodyValidation), validateSchema, async (req: Request, res: Response) => {
  try {
    const requestId = getRequestIdParam(req);
    const authReq = req as Request & { userEmail?: string };
    const managerEmail = authReq.userEmail;

    if (!managerEmail) {
      return res.status(401).json({ message: "Access Denied!" });
    }

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid tenant id." });
    }

    const managerUser = await userSchema.findOne<UserDTO>({ emailAddress: managerEmail }).select({}).exec();
    if (!managerUser || !(Array.isArray(managerUser.type) && managerUser.type.includes("manager"))) {
      return res.status(403).json({ message: "Access Forbidden!" });
    }

    const linkedSecurityCompany = await resolveSecurityCompanyForUser(managerUser);
    if (!linkedSecurityCompany) {
      return res.status(400).json({ message: "Manager is not linked to a security company." });
    }

    const tenantId = new ObjectId(requestId);
    const existingTenant = await userSchema.findById<UserDTO>(tenantId).select({}).exec();

    if (!existingTenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    const tenantRoles = Array.isArray(existingTenant.type) ? existingTenant.type : [];
    if (!tenantRoles.includes("tenant") && !tenantRoles.includes("user")) {
      return res.status(400).json({ message: "Selected record is not a tenant." });
    }

    const existingResident = await resolveResidentForTenantUser(existingTenant);
    if (!existingResident) {
      return res.status(404).json({ message: "Tenant resident details not found." });
    }

    const tenantCompanyId = resolveCompanyIdFromTenantContext(existingTenant, existingResident);
    if (tenantCompanyId && tenantCompanyId !== String(linkedSecurityCompany._id)) {
      return res.status(403).json({ message: "Tenant does not belong to your security company." });
    }

    const body = req.body as {
      name: string;
      surname: string;
      emailAddress: string;
      cellNumber: string;
      idNumber?: string;
      address: string;
      residenceType: "complex" | "community";
      complexId?: string;
      complexName?: string;
      communityId?: string;
      communityResidenceType?: "house" | "complex";
      communityComplexId?: string;
      vehicles?: Array<{ make: string; model: string; reg: string; color?: string }>;
    };

    const previousResidenceType = String(existingResident?.residenceType ?? "") as "complex" | "community";
    const previousCommunityResidenceType = String(existingResident?.communityResidenceType ?? "") as "house" | "complex";
    const previousAddress = String(existingResident?.address ?? "");
    const previousComplexId = String(existingResident?.complex?._id ?? "");

    const normalizedEmail = body.emailAddress.trim().toLowerCase();
    const duplicateUser = await userSchema.findOne({ emailAddress: normalizedEmail, _id: { $ne: tenantId } }).select({ _id: 1 }).lean();
    if (duplicateUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    const duplicateResident = await residentSchema.findOne({
      emailAddress: normalizedEmail,
      _id: { $ne: existingResident?._id ?? null },
      userId: { $ne: tenantId },
    }).select({ _id: 1 }).lean();
    if (duplicateResident) {
      return res.status(409).json({ message: "Resident with this email already exists." });
    }

    const trimmedAddress = body.address.trim();
    let linkedComplex: any = null;
    let linkedGatedCommunity: any = null;
    let communityIdValue = "";
    let communityResidenceTypeValue = "";
    let communityComplexIdValue = "";
    let unitNumberValue = "";
    let houseNumberValue = "";

    if (body.residenceType === "complex") {
      if (!body.complexId || !ObjectId.isValid(body.complexId)) {
        return res.status(400).json({ message: "Valid complex is required for complex residence." });
      }

      linkedComplex = await complexSchema.findById(body.complexId).select({ _id: 1, name: 1, gatedCommunityName: 1 }).lean();
      if (!linkedComplex) {
        return res.status(404).json({ message: "Complex not found." });
      }

      unitNumberValue = trimmedAddress;
    }

    if (body.residenceType === "community") {
      if (!body.communityId || !ObjectId.isValid(body.communityId)) {
        return res.status(400).json({ message: "Valid gated community is required for community residence." });
      }

      linkedGatedCommunity = await gatedCommunitySchema.findById(body.communityId).select({ _id: 1, name: 1 }).lean();
      if (!linkedGatedCommunity) {
        return res.status(404).json({ message: "Gated community not found." });
      }

      communityIdValue = String(linkedGatedCommunity._id);
      communityResidenceTypeValue = body.communityResidenceType ?? "house";

      if (communityResidenceTypeValue === "complex") {
        if (!body.communityComplexId || !ObjectId.isValid(body.communityComplexId)) {
          return res.status(400).json({ message: "Valid gated community complex is required." });
        }

        const communityComplex = await complexSchema.findById(body.communityComplexId).select({ _id: 1, name: 1, gatedCommunityName: 1 }).lean();
        if (!communityComplex) {
          return res.status(404).json({ message: "Community complex not found." });
        }

        const complexCommunityName = String(communityComplex.gatedCommunityName ?? "").trim().toLowerCase();
        const selectedCommunityName = String(linkedGatedCommunity.name ?? "").trim().toLowerCase();
        if (!complexCommunityName || complexCommunityName !== selectedCommunityName) {
          return res.status(400).json({ message: "Selected complex does not belong to the selected gated community." });
        }

        linkedComplex = communityComplex;
        communityComplexIdValue = String(communityComplex._id);
        unitNumberValue = trimmedAddress;
      } else {
        houseNumberValue = trimmedAddress;
      }
    }

    const updatedTenant = await userSchema.findByIdAndUpdate(
      tenantId,
      {
        $set: {
          name: body.name.trim(),
          surname: body.surname.trim(),
          emailAddress: normalizedEmail,
          cellNumber: body.cellNumber.trim(),
          idNumber: body.idNumber?.trim() || undefined,
        },
        $unset: {
          address: "",
          residenceType: "",
          complex: "",
          gatedCommunity: "",
          communityId: "",
          communityResidenceType: "",
          communityComplexId: "",
          unitNumber: "",
          houseNumber: "",
          vehicles: "",
          securityCompany: "",
          residentId: "",
        },
      },
      { new: true }
    ).select({}).exec();

    if (!updatedTenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    const previousUsesUnit =
      previousResidenceType === "complex" ||
      previousResidenceType === "community";
    const nextUsesUnit =
      body.residenceType === "complex" ||
      body.residenceType === "community";

    const nextComplexId = String(linkedComplex?._id ?? "");
    const nextCommunityId = String(linkedGatedCommunity?._id ?? "");
    const nextAddress = trimmedAddress;

    if (previousUsesUnit && (!nextUsesUnit || previousComplexId !== nextComplexId || previousAddress !== nextAddress)) {
      await unlinkTenantFromUnit(
        String(updatedTenant._id ?? ""),
        {
          complexId: previousComplexId,
          gatedCommunityId: previousComplexId ? "" : String(existingResident?.communityId ?? ""),
        },
        previousAddress,
      );
    }

    if (nextUsesUnit) {
      await linkTenantToUnit(
        String(updatedTenant._id ?? ""),
        {
          complex: linkedComplex
            ? {
                _id: nextComplexId,
                name: String(linkedComplex.name ?? ""),
                address: String(linkedComplex.address ?? ""),
              }
            : null,
          gatedCommunity: linkedGatedCommunity
            ? {
                _id: nextCommunityId,
                name: String(linkedGatedCommunity.name ?? ""),
              }
            : null,
        },
        nextAddress,
      );
    }

    const residentFilter = existingResident?._id
      ? { _id: existingResident._id }
      : {
          $or: [
            { userId: tenantId },
            { emailAddress: existingTenant.emailAddress },
          ],
        };

    const residentPayload = {
      userId: updatedTenant._id,
      name: updatedTenant.name,
      surname: updatedTenant.surname,
      emailAddress: updatedTenant.emailAddress,
      cellNumber: updatedTenant.cellNumber,
      idNumber: updatedTenant.idNumber,
      residenceType: body.residenceType,
      complex: linkedComplex
        ? {
            _id: linkedComplex._id,
            name: linkedComplex.name ?? "",
            gatedCommunityName: linkedComplex.gatedCommunityName ?? "",
          }
        : null,
      gatedCommunity: linkedGatedCommunity
        ? {
            _id: linkedGatedCommunity._id,
            name: linkedGatedCommunity.name ?? "",
          }
        : null,
      communityId: communityIdValue,
      communityResidenceType: communityResidenceTypeValue,
      communityComplexId: communityComplexIdValue,
      unitNumber: unitNumberValue,
      houseNumber: houseNumberValue,
      address: trimmedAddress,
      vehicles: [],
      securityCompany: linkedSecurityCompany
        ? {
            _id: linkedSecurityCompany._id,
            name: linkedSecurityCompany.name,
          }
        : null,
      createdBy: managerEmail,
    };

    let updatedResident = await residentSchema.findOneAndUpdate(
      residentFilter,
      { $set: residentPayload },
      { new: true }
    ).exec();

    if (!updatedResident) {
      const createdResident = await new residentSchema(residentPayload).save();
      updatedResident = createdResident;
    }

    await syncTenantVehiclesForUser(
      {
        _id: updatedTenant._id,
        name: updatedTenant.name,
        surname: updatedTenant.surname,
        emailAddress: updatedTenant.emailAddress,
        cellNumber: updatedTenant.cellNumber,
      },
      body.vehicles,
    );

    return res.status(200).json({
      message: "Tenant updated successfully!",
      payload: {
        user: updatedTenant,
        resident: updatedResident,
      },
    });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

userRouter.delete("/tenant/:id", AuthMiddleware, async (req: Request, res: Response) => {
  try {
    const requestId = getRequestIdParam(req);
    const authReq = req as Request & { userEmail?: string };
    const managerEmail = authReq.userEmail;

    if (!managerEmail) {
      return res.status(401).json({ message: "Access Denied!" });
    }

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid tenant id." });
    }

    const managerUser = await userSchema.findOne<UserDTO>({ emailAddress: managerEmail }).select({}).exec();
    if (!managerUser || !(Array.isArray(managerUser.type) && managerUser.type.includes("manager"))) {
      return res.status(403).json({ message: "Access Forbidden!" });
    }

    const linkedSecurityCompany = await resolveSecurityCompanyForUser(managerUser);
    if (!linkedSecurityCompany) {
      return res.status(400).json({ message: "Manager is not linked to a security company." });
    }

    const tenantId = new ObjectId(requestId);
    const tenant = await userSchema.findById<UserDTO>(tenantId).select({}).exec();

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    const tenantRoles = Array.isArray(tenant.type) ? tenant.type : [];
    if (!tenantRoles.includes("tenant") && !tenantRoles.includes("user")) {
      return res.status(400).json({ message: "Selected record is not a tenant." });
    }

    const tenantResident = await resolveResidentForTenantUser(tenant);
    if (!tenantResident) {
      return res.status(404).json({ message: "Tenant resident details not found." });
    }

    const tenantCompanyId = resolveCompanyIdFromTenantContext(tenant, tenantResident);
    if (tenantCompanyId && tenantCompanyId !== String(linkedSecurityCompany._id)) {
      return res.status(403).json({ message: "Tenant does not belong to your security company." });
    }

    const tenantUsesUnit =
      tenantResident.residenceType === "complex" ||
      tenantResident.residenceType === "community";
    if (tenantUsesUnit) {
      await unlinkTenantFromUnit(
        String(tenant._id ?? ""),
        {
          complexId: String(tenantResident?.complex?._id ?? ""),
          gatedCommunityId: String(tenantResident?.communityId ?? ""),
        },
        String(tenantResident?.address ?? "")
      );
    }

    const residentFilter = tenantResident?._id
      ? { _id: tenantResident._id }
      : {
          $or: [
            { userId: tenantId },
            { emailAddress: tenant.emailAddress },
          ],
        };

    const deletedResident = await residentSchema.findOneAndDelete(residentFilter).exec();
    await vehicleSchema.deleteMany({ "user._id": { $in: [String(tenantId), tenantId] } });
    const deletedTenant = await userSchema.findByIdAndDelete(tenantId).select({}).exec();

    return res.status(200).json({
      message: "Tenant deleted successfully!",
      payload: {
        user: deletedTenant,
        resident: deletedResident,
      },
    });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

userRouter.patch("/security-assignment/:id", AuthMiddleware, checkSchema(securityAssignmentBodyValidation), validateSchema, async (req: Request, res: Response) => {
  try {
    const requestId = getRequestIdParam(req);
    const authReq = req as Request & { userEmail?: string };
    const managerEmail = authReq.userEmail;

    if (!managerEmail) {
      return res.status(401).json({ message: "Access Denied!" });
    }

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid employee id." });
    }

    const managerUser = await userSchema.findOne<UserDTO>({ emailAddress: managerEmail }).select({}).exec();
    if (!managerUser || !(Array.isArray(managerUser.type) && managerUser.type.includes("manager"))) {
      return res.status(403).json({ message: "Access Forbidden!" });
    }

    const linkedSecurityCompany = await resolveSecurityCompanyForUser(managerUser);
    if (!linkedSecurityCompany) {
      return res.status(400).json({ message: "Manager is not linked to a security company." });
    }

    const employeeId = new ObjectId(requestId);
    const employee = await userSchema.findById<UserDTO>(employeeId).select({}).exec();
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    const employeeCompanyId = employee?.securityCompany?._id ? String(employee.securityCompany._id) : "";
    if (employeeCompanyId && employeeCompanyId !== String(linkedSecurityCompany._id)) {
      return res.status(403).json({ message: "Employee does not belong to your security company." });
    }

    if (!Array.isArray(employee.type) || !employee.type.includes("security")) {
      return res.status(400).json({ message: "Selected record is not a security employee." });
    }

    const body = req.body as { assignedComplexes?: string[]; assignedCommunities?: string[] };
    const companyAssignment = findCompanyAssignmentForUser(linkedSecurityCompany, String(employee._id ?? ""));
    const assignedComplexes = Array.isArray(body.assignedComplexes)
      ? normalizeStringList(body.assignedComplexes)
      : normalizeStringList(companyAssignment?.assignedComplexes);

    const assignedCommunities = Array.isArray(body.assignedCommunities)
      ? normalizeStringList(body.assignedCommunities)
      : normalizeStringList(companyAssignment?.assignedCommunities);

    await upsertCompanyEmployeeAssignment(String(linkedSecurityCompany._id), {
      userId: String(employee._id),
      assignedComplexes,
      assignedCommunities,
      position: companyAssignment?.position,
      status: companyAssignment?.status,
      contractStartDate: companyAssignment?.contractStartDate ?? null,
      contractEndDate: companyAssignment?.contractEndDate ?? null,
      createdBy: companyAssignment?.createdBy ?? managerEmail,
    });

    const updatedEmployee = await userSchema.findByIdAndUpdate(
      employeeId,
      {
        $set: {
          complex: assignedComplexes.length > 0
            ? {
                _id: assignedComplexes[0],
                name: employee?.complex?.name ?? "",
              }
            : null,
          securityCompany: {
            _id: linkedSecurityCompany._id,
            name: linkedSecurityCompany.name,
          },
        },
        $unset: {
          assignedComplexes: "",
          assignedCommunities: "",
          employeeContracts: "",
        },
      },
      { new: true }
    ).select({}).exec();

    const responsePayload = updatedEmployee
      ? {
          ...updatedEmployee.toObject(),
          assignedComplexes,
          assignedCommunities,
        }
      : null;

    return res.status(200).json({
      message: "Security assignment updated successfully!",
      payload: responsePayload,
    });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

userRouter.patch("/security-employee/:id", AuthMiddleware, checkSchema(securityEmployeeBodyValidation), validateSchema, async (req: Request, res: Response) => {
  try {
    const requestId = getRequestIdParam(req);
    const authReq = req as Request & { userEmail?: string };
    const managerEmail = authReq.userEmail;

    if (!managerEmail) {
      return res.status(401).json({ message: "Access Denied!" });
    }

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid employee id." });
    }

    const managerUser = await userSchema.findOne<UserDTO>({ emailAddress: managerEmail }).select({}).exec();
    if (!managerUser || !(Array.isArray(managerUser.type) && managerUser.type.includes("manager"))) {
      return res.status(403).json({ message: "Access Forbidden!" });
    }

    const linkedSecurityCompany = await resolveSecurityCompanyForUser(managerUser);
    if (!linkedSecurityCompany) {
      return res.status(400).json({ message: "Manager is not linked to a security company." });
    }

    const employeeId = new ObjectId(requestId);
    const existingEmployee = await userSchema.findById<UserDTO>(employeeId).select({}).exec();
    if (!existingEmployee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    const employeeCompanyId = existingEmployee?.securityCompany?._id ? String(existingEmployee.securityCompany._id) : "";
    if (employeeCompanyId && employeeCompanyId !== String(linkedSecurityCompany._id)) {
      return res.status(403).json({ message: "Employee does not belong to your security company." });
    }

    const body = req.body as {
      name: string;
      surname: string;
      emailAddress: string;
      cellNumber: string;
      position: string;
      status?: "active" | "inactive";
      assignedComplexId?: string;
      assignedComplexName?: string;
      assignedGatedCommunityName?: string;
      contractStartDate?: string;
      contractEndDate?: string;
    };

    const normalizedEmail = body.emailAddress.trim().toLowerCase();
    const duplicateUser = await userSchema.findOne({ emailAddress: normalizedEmail, _id: { $ne: employeeId } }).select({ _id: 1 }).lean();
    if (duplicateUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    const normalizedPosition = (body.position ?? "").toLowerCase().replace(/[^a-z]/g, "");
    const isAdminGuard = normalizedPosition.includes("admin");
    const employeePosition: "Guard" | "admin-Guard" = isAdminGuard ? "admin-Guard" : "Guard";

    const existingCompanyAssignment = findCompanyAssignmentForUser(linkedSecurityCompany, String(employeeId));

    const updatedContract = {
      securityCompany: {
        _id: linkedSecurityCompany._id,
        name: linkedSecurityCompany.name,
      },
      position: employeePosition,
      status: body.status ?? "active",
      contractStartDate: body.contractStartDate
        ? new Date(body.contractStartDate)
        : (existingCompanyAssignment?.contractStartDate ?? new Date()),
      contractEndDate: body.contractEndDate
        ? new Date(body.contractEndDate)
        : (existingCompanyAssignment?.contractEndDate ?? null),
      createdBy: existingCompanyAssignment?.createdBy ?? managerEmail,
    };

    const updatedEmployee = await userSchema.findByIdAndUpdate(
      employeeId,
      {
        $set: {
          name: body.name.trim(),
          surname: body.surname.trim(),
          emailAddress: normalizedEmail,
          cellNumber: body.cellNumber.trim(),
          movedOut: (body.status ?? "active") === "inactive",
          complex: body.assignedComplexId
            ? {
                _id: body.assignedComplexId,
                name: body.assignedComplexName ?? "",
              }
            : null,
          type: isAdminGuard ? ["security", "admin"] : ["security"],
          securityCompany: {
            _id: linkedSecurityCompany._id,
            name: linkedSecurityCompany.name,
          },
        },
        $unset: {
          assignedComplexes: "",
          assignedCommunities: "",
          employeeContracts: "",
        },
      },
      { new: true }
    ).select({}).exec();

    const nextAssignedComplexes = body.assignedComplexId
      ? [String(body.assignedComplexId)]
      : normalizeStringList(existingCompanyAssignment?.assignedComplexes);
    const nextAssignedCommunities = body.assignedGatedCommunityName
      ? [String(body.assignedGatedCommunityName)]
      : normalizeStringList(existingCompanyAssignment?.assignedCommunities);

    await upsertCompanyEmployeeAssignment(String(linkedSecurityCompany._id), {
      userId: String(employeeId),
      assignedComplexes: nextAssignedComplexes,
      assignedCommunities: nextAssignedCommunities,
      position: employeePosition,
      status: body.status ?? "active",
      contractStartDate: updatedContract.contractStartDate ?? null,
      contractEndDate: updatedContract.contractEndDate ?? null,
      createdBy: updatedContract.createdBy,
    });

    return res.status(200).json({ message: "Employee updated successfully!", payload: updatedEmployee });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

userRouter.delete("/security-employee/:id", AuthMiddleware, async (req: Request, res: Response) => {
  try {
    const requestId = getRequestIdParam(req);
    const authReq = req as Request & { userEmail?: string };
    const managerEmail = authReq.userEmail;

    if (!managerEmail) {
      return res.status(401).json({ message: "Access Denied!" });
    }

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid employee id." });
    }

    const managerUser = await userSchema.findOne<UserDTO>({ emailAddress: managerEmail }).select({}).exec();
    if (!managerUser || !(Array.isArray(managerUser.type) && managerUser.type.includes("manager"))) {
      return res.status(403).json({ message: "Access Forbidden!" });
    }

    const linkedSecurityCompany = await resolveSecurityCompanyForUser(managerUser);
    if (!linkedSecurityCompany) {
      return res.status(400).json({ message: "Manager is not linked to a security company." });
    }

    const employeeId = new ObjectId(requestId);
    const employee = await userSchema.findById<UserDTO>(employeeId).select({}).exec();
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    const employeeCompanyId = employee?.securityCompany?._id ? String(employee.securityCompany._id) : "";
    if (employeeCompanyId && employeeCompanyId !== String(linkedSecurityCompany._id)) {
      return res.status(403).json({ message: "Employee does not belong to your security company." });
    }

    await removeCompanyEmployeeAssignment(String(linkedSecurityCompany._id), String(employeeId));
    await userSchema.findByIdAndDelete(employeeId);
    return res.status(200).json({ message: "Employee deleted successfully!", payload: employee });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

userRouter.post("/login", checkSchema(loginBodyValidation), validateSchema, async (req: Request, res: Response) => {
  try {
    const body = req.body as { emailAddress: string; password: string; };
    const normalizedEmail = body.emailAddress.trim().toLowerCase();

    const user = await userSchema.findOne<UserDTO>({
      emailAddress: normalizedEmail,
    }).select({}).exec();

    if (!user) return res.status(401).json({message: "Invalid login details!"});

    const isValidPassword = await bcrypt.compare(body.password, user.password as unknown as string);

    if (!isValidPassword) return res.status(401).json({message: "Invalid login details"});

    const token = GenerateJWT(user.emailAddress, user.type);

    if (VerifyToken(token)) {
      const linkedSecurityCompany = await resolveSecurityCompanyForUser(user);
      const resolvedAssignments = resolveUserAssignments(user, linkedSecurityCompany);
      const resolvedEmployeeContracts = resolveUserEmployeeContracts(user, linkedSecurityCompany);
      const userRoles = Array.isArray(user.type) ? user.type : [];
      const isTenant = userRoles.includes("tenant") || userRoles.includes("user");
      const tenantResident = isTenant ? await resolveResidentForTenantUser(user) : null;
      const tenantVehicles = isTenant
        ? await vehicleSchema.find({ "user._id": { $in: [String(user._id ?? ""), user._id] } }).lean()
        : [];
      const normalizedTenantVehicles = tenantVehicles.map((vehicle: any) => ({
        make: String(vehicle?.make ?? ""),
        model: String(vehicle?.model ?? ""),
        reg: String(vehicle?.registerationNumber ?? vehicle?.registrationNumber ?? ""),
        color: String(vehicle?.color ?? "") || "",
      }));
      return res.status(200).json({
        message: "Logged in successfully",
        payload: {
          token,
          type: user.type,
          user: {
            _id: user._id,
            emailAddress: user.emailAddress,
            name: user.name,
            surname: user.surname,
            cellNumber: user.cellNumber,
            type: user.type,
            profilePhoto: user.profilePhoto,
            complex: isTenant ? (tenantResident?.complex ?? null) : (user.complex ?? null),
            residenceType: isTenant ? (tenantResident?.residenceType ?? "") : (user as any).residenceType,
            gatedCommunity: isTenant ? (tenantResident?.gatedCommunity ?? null) : (user as any).gatedCommunity,
            communityId: isTenant ? (tenantResident?.communityId ?? "") : (user as any).communityId,
            communityResidenceType: isTenant ? (tenantResident?.communityResidenceType ?? "") : (user as any).communityResidenceType,
            communityComplexId: isTenant ? (tenantResident?.communityComplexId ?? "") : (user as any).communityComplexId,
            unitNumber: isTenant ? (tenantResident?.unitNumber ?? "") : (user as any).unitNumber,
            houseNumber: isTenant ? (tenantResident?.houseNumber ?? "") : (user as any).houseNumber,
            address: isTenant ? (tenantResident?.address ?? "") : (user as any).address,
            vehicles: isTenant ? normalizedTenantVehicles : [],
            assignedComplexes: resolvedAssignments.assignedComplexes,
            assignedCommunities: resolvedAssignments.assignedCommunities,
            employeeContracts: resolvedEmployeeContracts,
            securityCompany: isTenant
              ? null
              : linkedSecurityCompany
              ? {
                  _id: linkedSecurityCompany._id,
                  name: linkedSecurityCompany.name,
                  email: linkedSecurityCompany.email,
                  contactNumber: linkedSecurityCompany.contactNumber,
                  contract: linkedSecurityCompany.contract ?? [],
                }
              : (user.securityCompany ?? null),
          },
        },
      });
    }

    return res.status(500).json({message: "Error issuing valid token signature. Please try again later."});
  } catch {
    return res.status(500).json({message: "Internal Server Error"});
  }
});

//Deactivate user
userRouter.delete("/deactivate/:id", AuthMiddleware, async (req, res) => {
  try {
    const requestId = getRequestIdParam(req as Request);
    // if (!isValidObjectID(req.params.id as string)) return res.status(400).send("Bad Request! Invalid Id");

    const objectId = new ObjectId(requestId);
    const user = await userSchema.findOneAndDelete({ _id: objectId });

    if (user) {
      return res.status(200).json(user);
    } else {
      return res.status(404).send("User details not found!");
    }
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

//Update profile
userRouter.patch("/update", AuthMiddleware, async (req, res) => {
  try {
    const authReq = req as Request & { userEmail?: string };
    const email = authReq.userEmail;
    if (!email) {
      return res.status(401).send("Access Denied!");
    }

    const updatePayload = req.body as Partial<UserDTO>;
    const user = await userSchema.findOneAndUpdate(
      { emailAddress: email },
      { $set: updatePayload },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).send("User details not found!");
    }

    return res.status(200).json({ message: "User details updated", payload: user });
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

//Fetch user details
userRouter.get("/current", AuthMiddleware, async (req, res) => {
  try {
    const authReq = req as Request & { userEmail?: string };
    const email = authReq.userEmail;
    if (!email) {
      return res.status(401).send("Access Denied!");
    }

    const user = await userSchema.findOne<UserDTO>({ emailAddress: email }).lean();

    if (user) {
      const linkedSecurityCompany = await resolveSecurityCompanyForUser(user);
      const resolvedAssignments = resolveUserAssignments(user, linkedSecurityCompany);
      const resolvedEmployeeContracts = resolveUserEmployeeContracts(user, linkedSecurityCompany);
      const userRoles = Array.isArray(user.type) ? user.type : [];
      const isTenant = userRoles.includes("tenant") || userRoles.includes("user");
      const tenantResident = isTenant ? await resolveResidentForTenantUser(user) : null;
      const tenantVehicles = isTenant
        ? await vehicleSchema.find({ "user._id": { $in: [String(user._id ?? ""), user._id] } }).lean()
        : [];
      const normalizedTenantVehicles = tenantVehicles.map((vehicle: any) => ({
        make: String(vehicle?.make ?? ""),
        model: String(vehicle?.model ?? ""),
        reg: String(vehicle?.registerationNumber ?? vehicle?.registrationNumber ?? ""),
        color: String(vehicle?.color ?? "") || "",
      }));
      const { residentId: _residentId, vehicles: _legacyVehicles, ...userWithoutLegacyLinks } = user as any;
      return res.status(200).json({
        ...userWithoutLegacyLinks,
        complex: isTenant ? (tenantResident?.complex ?? null) : (user as any).complex,
        residenceType: isTenant ? (tenantResident?.residenceType ?? "") : (user as any).residenceType,
        gatedCommunity: isTenant ? (tenantResident?.gatedCommunity ?? null) : (user as any).gatedCommunity,
        communityId: isTenant ? (tenantResident?.communityId ?? "") : (user as any).communityId,
        communityResidenceType: isTenant ? (tenantResident?.communityResidenceType ?? "") : (user as any).communityResidenceType,
        communityComplexId: isTenant ? (tenantResident?.communityComplexId ?? "") : (user as any).communityComplexId,
        unitNumber: isTenant ? (tenantResident?.unitNumber ?? "") : (user as any).unitNumber,
        houseNumber: isTenant ? (tenantResident?.houseNumber ?? "") : (user as any).houseNumber,
        address: isTenant ? (tenantResident?.address ?? "") : (user as any).address,
        vehicles: isTenant ? normalizedTenantVehicles : [],
        assignedComplexes: resolvedAssignments.assignedComplexes,
        assignedCommunities: resolvedAssignments.assignedCommunities,
        employeeContracts: resolvedEmployeeContracts,
        securityCompany: isTenant
          ? null
          : linkedSecurityCompany
          ? {
              _id: linkedSecurityCompany._id,
              name: linkedSecurityCompany.name,
              email: linkedSecurityCompany.email,
              contactNumber: linkedSecurityCompany.contactNumber,
              contract: linkedSecurityCompany.contract ?? [],
            }
          : (user.securityCompany ?? null),
      });
    } else {
      return res.status(404).send("User details not found!");
    }
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

userRouter.get("/", /*AuthMiddleware,*/ async (req, res) => {
  try {
    // if (!isValidObjectID(req.params.id as string)) return res.status(400).send("Bad Request! Invalid Id");
    const users = await userSchema.find({}).lean();
    const securityCompanies = await securityCompanySchema.find({}).select({ _id: 1, employeeAssignments: 1 }).lean();
    const residents = await residentSchema.find({}).lean();
    const vehicles = await vehicleSchema.find({}).lean();

    const companyById = new Map<string, any>();
    for (const company of securityCompanies) {
      const id = String(company?._id ?? "");
      if (id) {
        companyById.set(id, company);
      }
    }

    const residentByUserId = new Map<string, any>();
    const residentByEmail = new Map<string, any>();
    for (const resident of residents) {
      const userId = String((resident as any)?.userId ?? "");
      const emailAddress = String((resident as any)?.emailAddress ?? "").trim().toLowerCase();
      if (userId) {
        residentByUserId.set(userId, resident);
      }
      if (emailAddress) {
        residentByEmail.set(emailAddress, resident);
      }
    }

    const vehiclesByUserId = new Map<string, Array<{ make: string; model: string; reg: string; color?: string }>>();
    for (const vehicle of vehicles) {
      const userId = String((vehicle as any)?.user?._id ?? "");
      if (!userId) {
        continue;
      }

      const list = vehiclesByUserId.get(userId) ?? [];
      list.push({
        make: String((vehicle as any)?.make ?? ""),
        model: String((vehicle as any)?.model ?? ""),
        reg: String((vehicle as any)?.registerationNumber ?? (vehicle as any)?.registrationNumber ?? ""),
        color: String((vehicle as any)?.color ?? "") || undefined,
      });
      vehiclesByUserId.set(userId, list);
    }

    const usersWithAssignments = users.map((user: any) => {
      const userCompanyId = String(user?.securityCompany?._id ?? "");
      const company = userCompanyId ? companyById.get(userCompanyId) : null;
      const resolvedAssignments = resolveUserAssignments(user, company);
      const resolvedEmployeeContracts = resolveUserEmployeeContracts(user, company);
      const userRoles = Array.isArray(user?.type) ? user.type : [];
      const isTenant = userRoles.includes("tenant") || userRoles.includes("user");
      const resident = isTenant
        ? residentByUserId.get(String(user?._id ?? "")) ?? residentByEmail.get(String(user?.emailAddress ?? "").trim().toLowerCase())
        : null;
      const tenantVehicles = isTenant ? (vehiclesByUserId.get(String(user?._id ?? "")) ?? []) : [];
      const { residentId: _residentId, vehicles: _legacyVehicles, ...userWithoutLegacyLinks } = user as any;

      return {
        ...userWithoutLegacyLinks,
        complex: isTenant ? (resident?.complex ?? null) : user?.complex,
        residenceType: isTenant ? (resident?.residenceType ?? "") : user?.residenceType,
        gatedCommunity: isTenant ? (resident?.gatedCommunity ?? null) : user?.gatedCommunity,
        communityId: isTenant ? (resident?.communityId ?? "") : user?.communityId,
        communityResidenceType: isTenant ? (resident?.communityResidenceType ?? "") : user?.communityResidenceType,
        communityComplexId: isTenant ? (resident?.communityComplexId ?? "") : user?.communityComplexId,
        unitNumber: isTenant ? (resident?.unitNumber ?? "") : user?.unitNumber,
        houseNumber: isTenant ? (resident?.houseNumber ?? "") : user?.houseNumber,
        address: isTenant ? (resident?.address ?? "") : user?.address,
        vehicles: isTenant ? tenantVehicles : [],
        securityCompany: isTenant ? null : user?.securityCompany,
        assignedComplexes: resolvedAssignments.assignedComplexes,
        assignedCommunities: resolvedAssignments.assignedCommunities,
        employeeContracts: resolvedEmployeeContracts,
      };
    });

    if (usersWithAssignments.length > 0) {
      return res.status(200).json({message: "Users found", payload: usersWithAssignments});
    } else {
      return res.status(404).json({message: "Users not found!"});
    }
  } catch {
    return res.status(500).json({message: "Internal Server Error"});
  }
});

export default userRouter;
