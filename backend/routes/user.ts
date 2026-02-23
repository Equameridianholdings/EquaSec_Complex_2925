import complexSchema from "#db/complexSchema.js";
import gatedCommunitySchema from "#db/gatedCommunity.js";
import residentSchema from "#db/residentSchema.js";
import securityCompanySchema from "#db/securityCompanySchema.js";
import unitSchema from "#db/unitSchema.js";
import userSchema from "#db/userSchema.js";
import vehicleSchema from "#db/vehicleSchema.js";
import { complexDTO } from "#interfaces/complexDTO.js";
import { userBodyValidation, UserDTO } from "#interfaces/userDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
// import { encrypt } from "#utils/encryption.js";
import GenerateJWT from "#utils/generateJWT.js";
import { sendSecurityCompanyCode } from "#utils/sendEmail.js";
import { ValidObjectId } from "#utils/validObjectId.js";
import VerifyToken from "#utils/verifyToken.js";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { Router } from "express";
import { checkSchema, Schema } from "express-validator/lib/middlewares/schema.js";
import { body } from "express-validator/lib/middlewares/validation-chain-builders.js";
import { ObjectId } from "mongodb";
import { isKeyObject } from "util/types";

const userRouter = Router();

interface CompanyAssignment {
  assignedCommunities: string[];
  assignedComplexes: string[];
  contractEndDate: Date | null;
  contractStartDate: Date | null;
  createdBy?: string;
  position?: string;
  status?: "active" | "inactive";
  userId: string;
}

interface CompanyWithAssignments {
  employeeAssignments?: unknown;
}

interface TenantResidentLike {
  _id?: unknown;
  address?: string;
  communityComplexId?: null | string;
  communityId?: null | string;
  communityResidenceType?: null | string;
  complex?: unknown;
  gatedCommunity?: unknown;
  houseNumber?: null | string;
  residenceType?: null | string;
  securityCompany?: null | TenantSecurityCompanyRef;
  unitNumber?: null | string;
}

interface TenantSecurityCompanyRef {
  _id?: unknown;
  name?: string;
}

interface TenantUserLike {
  _id?: unknown;
  assignedCommunities?: unknown;
  assignedComplexes?: unknown;
  emailAddress?: string;
  employeeContracts?: unknown;
  movedOut?: boolean;
  securityCompany?: null | TenantSecurityCompanyRef;
}

interface TenantVehicle {
  color?: string;
  make: string;
  model: string;
  reg: string;
}

interface TenantVehicleInput {
  color?: unknown;
  make?: unknown;
  model?: unknown;
  reg?: unknown;
  registerationNumber?: unknown;
  registrationNumber?: unknown;
}

interface UserTenantFields {
  address?: string;
  communityComplexId?: null | string;
  communityId?: null | string;
  communityResidenceType?: null | string;
  complex?: unknown;
  gatedCommunity?: unknown;
  houseNumber?: null | string;
  residenceType?: null | string;
  securityCompany?: null | TenantSecurityCompanyRef;
  unitNumber?: null | string;
}

const resolveTenantProfile = (tenantUser: UserDTO & UserTenantFields, tenantResident: null | TenantResidentLike): TenantResidentLike => {
  if (tenantResident) {
    return tenantResident;
  }

  return {
    address: tenantUser.address ?? "",
    communityComplexId: tenantUser.communityComplexId ?? "",
    communityId: tenantUser.communityId ?? "",
    communityResidenceType: tenantUser.communityResidenceType ?? "",
    complex: tenantUser.complex ?? null,
    gatedCommunity: tenantUser.gatedCommunity ?? null,
    houseNumber: tenantUser.houseNumber ?? "",
    residenceType: tenantUser.residenceType ?? "",
    securityCompany: tenantUser.securityCompany ?? null,
    unitNumber: tenantUser.unitNumber ?? "",
  };
};

const getRequestIdParam = (req: Request): string => {
  const id = req.params.id;
  if (Array.isArray(id)) {
    return id[0] ?? "";
  }
  return id ?? "";
};

const resolveSecurityCompanyForUser = async (user: { emailAddress: string; securityCompany?: null | UserDTO["securityCompany"] }) => {
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

const normalizeTenantVehicles = (vehicles: unknown): TenantVehicle[] => {
  if (!Array.isArray(vehicles)) {
    return [];
  }

  return vehicles
    .map((vehicle): TenantVehicle => {
      const candidate: TenantVehicleInput =
        vehicle && typeof vehicle === "object" ? (vehicle as TenantVehicleInput) : {};

      return {
        color: String(candidate.color ?? "").trim() || undefined,
        make: String(candidate.make ?? "").trim(),
        model: String(candidate.model ?? "").trim(),
        reg: String(candidate.reg ?? candidate.registrationNumber ?? candidate.registerationNumber ?? "").trim(),
      };
    })
    .filter((vehicle) => vehicle.make.length > 0 && vehicle.model.length > 0 && vehicle.reg.length > 0);
};

const syncTenantVehiclesForUser = async (
  user: { _id?: unknown; cellNumber?: string; emailAddress?: string; name?: string; surname?: string; },
  vehicles: unknown,
): Promise<void> => {
  const userId = String(user?._id ?? "").trim();
  if (!userId) {
    return;
  }

  const userIdVariants: (ObjectId | string)[] = [userId];
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
    cellNumber: String(user?.cellNumber ?? ""),
    emailAddress: String(user?.emailAddress ?? ""),
    name: String(user?.name ?? ""),
    surname: String(user?.surname ?? ""),
  };

  const docs = normalizedVehicles.map((vehicle) => ({
    color: vehicle.color,
    make: vehicle.make,
    model: vehicle.model,
    registerationNumber: vehicle.reg,
    user: linkedUser,
    year: 0,
  }));

  await vehicleSchema.insertMany(docs);
};

const resolveResidentForTenantUser = async (user: TenantUserLike): Promise<null | TenantResidentLike> => {
  const userId = String(user._id ?? "");
  if (userId && ObjectId.isValid(userId)) {
    const byUserId = await residentSchema.findOne({ userId: new ObjectId(userId) }).lean();
    if (byUserId) {
      return byUserId;
    }
  }

  const emailAddress = String(user.emailAddress ?? "").trim();
  if (!emailAddress) {
    return null;
  }

  return await residentSchema.findOne({ emailAddress }).lean();
};

const resolveCompanyIdFromTenantContext = (tenantUser: TenantUserLike, tenantResident: null | TenantResidentLike): string => {
  return String(tenantResident?.securityCompany?._id ?? tenantUser.securityCompany?._id ?? "");
};

const getCompanyEmployeeAssignments = (company: CompanyWithAssignments | null): CompanyAssignment[] => {
  if (!Array.isArray(company?.employeeAssignments)) {
    return [];
  }

  return company.employeeAssignments.map((entry) => sanitizeCompanyEmployeeAssignment(entry));
};

const sanitizeCompanyEmployeeAssignment = (entry: unknown): CompanyAssignment => {
  const candidate: Record<string, unknown> = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
  const statusValue = candidate.status;
  const status = statusValue === "active" || statusValue === "inactive" ? statusValue : undefined;

  return {
    assignedCommunities: normalizeStringList(candidate.assignedCommunities),
    assignedComplexes: normalizeStringList(candidate.assignedComplexes),
    contractEndDate: candidate.contractEndDate instanceof Date ? candidate.contractEndDate : null,
    contractStartDate: candidate.contractStartDate instanceof Date ? candidate.contractStartDate : null,
    createdBy: typeof candidate.createdBy === "string" ? candidate.createdBy : undefined,
    position: typeof candidate.position === "string" ? candidate.position : undefined,
    status,
    userId: String(candidate.userId ?? ""),
  };
};

const findCompanyAssignmentForUser = (company: CompanyWithAssignments | null, userId: string): CompanyAssignment | null => {
  if (!userId) {
    return null;
  }

  const assignments = getCompanyEmployeeAssignments(company);
  const match = assignments.find((item) => String(item.userId) === String(userId));
  return match ?? null;
};

const resolveUserAssignments = (user: TenantUserLike, company: CompanyWithAssignments | null): { assignedCommunities: string[]; assignedComplexes: string[]; } => {
  const assignment = findCompanyAssignmentForUser(company, String(user._id ?? ""));

  if (assignment) {
    return {
      assignedCommunities: normalizeStringList(assignment.assignedCommunities),
      assignedComplexes: normalizeStringList(assignment.assignedComplexes),
    };
  }

  return {
    assignedCommunities: normalizeStringList(user.assignedCommunities),
    assignedComplexes: normalizeStringList(user.assignedComplexes),
  };
};

const resolveUserEmployeeContracts = (user: TenantUserLike, company: CompanyWithAssignments | null): unknown[] => {
  const assignment = findCompanyAssignmentForUser(company, String(user._id ?? ""));

  if (assignment) {
    return [
      {
        assignedCommunities: normalizeStringList(assignment?.assignedCommunities),
        assignedComplexes: normalizeStringList(assignment?.assignedComplexes),
        contractEndDate: assignment?.contractEndDate ?? null,
        contractStartDate: assignment?.contractStartDate ?? null,
        createdBy: assignment?.createdBy,
        position: assignment?.position ?? "Guard",
        securityCompany: {
          _id: user.securityCompany?._id ?? "",
          name: user.securityCompany?.name ?? "",
        },
        status: assignment?.status ?? (user.movedOut ? "inactive" : "active"),
      },
    ];
  }

  return Array.isArray(user.employeeContracts) ? user.employeeContracts : [];
};

const upsertCompanyEmployeeAssignment = async (
  companyId: string,
  assignment: {
    assignedCommunities?: string[];
    assignedComplexes?: string[];
    contractEndDate?: Date | null;
    contractStartDate?: Date | null;
    createdBy?: string;
    position?: string;
    status?: "active" | "inactive";
    userId: string;
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
    .filter((item) => String(item.userId) !== userId)
    .map((item) => sanitizeCompanyEmployeeAssignment(item));
  const previous = findCompanyAssignmentForUser(company, userId);

  assignments.push(sanitizeCompanyEmployeeAssignment({
    assignedCommunities: normalizeStringList(assignment.assignedCommunities ?? previous?.assignedCommunities),
    assignedComplexes: normalizeStringList(assignment.assignedComplexes ?? previous?.assignedComplexes),
    contractEndDate: assignment.contractEndDate ?? previous?.contractEndDate ?? null,
    contractStartDate: assignment.contractStartDate ?? previous?.contractStartDate ?? null,
    createdBy: assignment.createdBy ?? previous?.createdBy,
    position: assignment.position ?? previous?.position,
    status: assignment.status ?? previous?.status,
    userId,
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

const extractUnitNumber = (address: string): null | number => {
  const match = /\d+/.exec(String(address ?? ""));
  if (!match) {
    return null;
  }

  const value = Number(match[0]);
  if (Number.isNaN(value)) {
    return null;
  }

  return value;
};

const normalizeName = (value: null | string | undefined): string => {
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
    const complexIdVariants: (ObjectId | string)[] = [String(complexId)];
    if (ObjectId.isValid(String(complexId))) {
      complexIdVariants.push(new ObjectId(String(complexId)));
    }

    const unit = await unitSchema.findOne({
      "complex._id": { $in: complexIdVariants },
      number: unitNumber,
    }).exec();

    return unit;
  }

  const gatedCommunityIdVariants: (ObjectId | string)[] = [String(gatedCommunityId)];
  if (ObjectId.isValid(String(gatedCommunityId))) {
    gatedCommunityIdVariants.push(new ObjectId(String(gatedCommunityId)));
  }

  const unit = await unitSchema.findOne({
    "gatedCommunity._id": { $in: gatedCommunityIdVariants },
    number: unitNumber,
  }).exec();

  return unit;
};

const linkTenantToUnit = async (
  tenantId: string,
  location: {
    complex?: null | { _id?: string; address?: string; name?: string; };
    gatedCommunity?: null | { _id?: string; name?: string };
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
      return value === (user.password as unknown as string);
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
      return res.status(500).json({ message: "Internal Server Error" });
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
    isLength: {
      errorMessage: "Incorrect password length",
      options: {
        max: 6,
        min: 6,
      },
    },
    matches: {
      errorMessage: "Password must be exactly 6 digits.",
      options: /^\d{6}$/,
    },
  },
};

const securityEmployeeBodyValidation: Schema = {
  cellNumber: {
    errorMessage: "Cell number must be 10 digits and start with 0",
    isEmpty: false,
    matches: {
      options: [/^0\d{9}$/],
    },
  },
  emailAddress: {
    errorMessage: "Invalid email address",
    isEmail: true,
    isEmpty: false,
  },
  name: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
  position: {
    errorMessage: "Invalid position",
    isIn: {
      options: [["Guard", "admin-Guard", "admin-guard", "adminGuard", "adminguard"]],
    },
  },
  status: {
    isIn: {
      options: [["active", "inactive"]],
    },
    optional: true,
  },
  surname: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
};

const tenantCreateBodyValidation: Schema = {
  address: {
    errorMessage: "Address is required",
    isEmpty: false,
  },
  cellNumber: {
    errorMessage: "Cell number must be 10 digits and start with 0",
    isEmpty: false,
    matches: {
      options: [/^0\d{9}$/],
    },
  },
  emailAddress: {
    errorMessage: "Invalid email address",
    isEmail: true,
    isEmpty: false,
  },
  name: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
  residenceType: {
    errorMessage: "Invalid residence type",
    isIn: {
      options: [["complex", "community"]],
    },
  },
  surname: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
};

const tenantUpdateBodyValidation: Schema = {
  address: {
    errorMessage: "Address is required",
    isEmpty: false,
  },
  cellNumber: {
    errorMessage: "Cell number must be 10 digits and start with 0",
    isEmpty: false,
    matches: {
      options: [/^0\d{9}$/],
    },
  },
  emailAddress: {
    errorMessage: "Invalid email address",
    isEmail: true,
    isEmpty: false,
  },
  name: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
  residenceType: {
    errorMessage: "Invalid residence type",
    isIn: {
      options: [["complex", "community"]],
    },
  },
  surname: {
    errorMessage: "Field is required",
    isEmpty: false,
  },
};

const securityAssignmentBodyValidation: Schema = {
  assignedCommunities: {
    isArray: true,
    optional: true,
  },
  assignedComplexes: {
    isArray: true,
    optional: true,
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
      assignedComplexId?: string;
      assignedComplexName?: string;
      assignedGatedCommunityName?: string;
      cellNumber: string;
      contractEndDate?: string;
      contractStartDate?: string;
      emailAddress: string;
      name: string;
      position: string;
      status?: "active" | "inactive";
      surname: string;
    };

    const normalizedPosition = (body.position ?? "").toLowerCase().replace(/[^a-z]/g, "");
    const isAdminGuard = normalizedPosition.includes("admin");
    const employeePosition: "admin-Guard" | "Guard" = isAdminGuard ? "admin-Guard" : "Guard";

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
      password: hashedPassword,
      profilePhoto: "",
      salt,
      securityCompany: {
        _id: linkedSecurityCompany._id,
        name: linkedSecurityCompany.name,
      },
      surname: body.surname,
      type: isAdminGuard ? ["security", "admin"] : ["security"],
    });

    await employeeUser.save();

    const initialAssignedComplexes = body.assignedComplexId ? [String(body.assignedComplexId)] : [];
    const initialAssignedCommunities = body.assignedGatedCommunityName ? [String(body.assignedGatedCommunityName)] : [];

    await upsertCompanyEmployeeAssignment(String(linkedSecurityCompany._id), {
      assignedCommunities: initialAssignedCommunities,
      assignedComplexes: initialAssignedComplexes,
      contractEndDate: body.contractEndDate ? new Date(body.contractEndDate) : null,
      contractStartDate: body.contractStartDate ? new Date(body.contractStartDate) : new Date(),
      createdBy: managerEmail,
      position: employeePosition,
      status: body.status ?? "active",
      userId: String(employeeUser._id),
    });

    try {
      await sendSecurityCompanyCode({
        code: temporaryPin,
        companyName: linkedSecurityCompany.name,
        to: normalizedEmail,
      });
    } catch {
      await removeCompanyEmployeeAssignment(String(linkedSecurityCompany._id), String(employeeUser._id));
      await userSchema.findByIdAndDelete(employeeUser._id);
      return res.status(500).json({ message: "Unable to send employee credentials email." });
    }

    return res.status(201).json({
      message: "Security employee added successfully!",
      payload: {
        emailSent: true,
        temporaryPin,
        user: employeeUser,
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
      address: string;
      cellNumber: string;
      communityComplexId?: string;
      communityId?: string;
      communityResidenceType?: "complex" | "house";
      complexId?: string;
      complexName?: string;
      emailAddress: string;
      idNumber?: string;
      name: string;
      residenceType: "community" | "complex";
      surname: string;
      vehicles?: { color?: string; make: string; model: string; reg: string; }[];
    };

    const normalizedEmail = body.emailAddress.trim().toLowerCase();
    const existingUser = await userSchema.findOne({ emailAddress: normalizedEmail }).select({ _id: 1 }).lean();
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    const temporaryPin = String(Math.floor(100000 + Math.random() * 900000));
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(temporaryPin, salt);

    const trimmedAddress = body.address.trim();
    let linkedComplex: null | { _id: unknown; address?: string; gatedCommunityName?: null | string; name?: string } = null;
    let linkedGatedCommunity: null | { _id: unknown; name?: string } = null;
    let communityIdValue = "";
    let communityResidenceTypeValue = "";
    let communityComplexIdValue = "";
    let unitNumberValue = "";
    let houseNumberValue = "";

    if (body.residenceType === "complex") {
      if (!body.complexId || !ObjectId.isValid(body.complexId)) {
        return res.status(400).json({ message: "Valid complex is required for complex residence." });
      }

      linkedComplex = await complexSchema.findById(body.complexId).select({ _id: 1, gatedCommunityName: 1, name: 1 }).lean();
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

        const communityComplex = await complexSchema.findById(body.communityComplexId).select({ _id: 1, gatedCommunityName: 1, name: 1 }).lean();
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

    const tenantUser = new userSchema({
      address: trimmedAddress,
      cellNumber: body.cellNumber.trim(),
      communityComplexId: communityComplexIdValue,
      communityId: communityIdValue,
      communityResidenceType: communityResidenceTypeValue,
      complex: linkedComplex
        ? {
            _id: linkedComplex._id,
            gatedCommunityName: linkedComplex.gatedCommunityName ?? "",
            name: linkedComplex.name ?? "",
          }
        : null,
      emailAddress: normalizedEmail,
      gatedCommunity: linkedGatedCommunity
        ? {
            _id: linkedGatedCommunity._id,
            name: linkedGatedCommunity.name ?? "",
          }
        : null,
      houseNumber: houseNumberValue,
      idNumber: body.idNumber?.trim() || undefined,
      movedOut: false,
      name: body.name.trim(),
      password: hashedPassword,
      profilePhoto: "",
      residenceType: body.residenceType,
      salt,
      securityCompany: linkedSecurityCompany
        ? {
            _id: linkedSecurityCompany._id,
            name: linkedSecurityCompany.name,
          }
        : null,
      surname: body.surname.trim(),
      type: ["tenant"],
      unitNumber: unitNumberValue,
    });

    try {
      await tenantUser.save();
    } catch {
      return res.status(500).json({ message: "Unable to save tenant user." });
    }

    try {
      await syncTenantVehiclesForUser(
        {
          _id: tenantUser._id,
          cellNumber: tenantUser.cellNumber,
          emailAddress: tenantUser.emailAddress,
          name: tenantUser.name,
          surname: tenantUser.surname,
        },
        body.vehicles,
      );
    } catch {
      await userSchema.findByIdAndDelete(tenantUser._id);
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
                  address: String(linkedComplex.address ?? ""),
                  name: String(linkedComplex.name ?? ""),
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
      return res.status(500).json({ message: "Unable to link tenant to unit." });
    }

    try {
      await sendSecurityCompanyCode({
        code: temporaryPin,
        companyName: linkedSecurityCompany?.name,
        to: normalizedEmail,
      });
    } catch {
      await vehicleSchema.deleteMany({ "user._id": { $in: [String(tenantUser._id ?? ""), tenantUser._id] } });
      await userSchema.findByIdAndDelete(tenantUser._id);
      return res.status(500).json({ message: "Unable to send tenant credentials email." });
    }

    return res.status(201).json({
      message: "Tenant registered successfully!",
      payload: {
        emailSent: true,
        resident: null,
        temporaryPin,
        user: tenantUser,
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
    const existingTenantProfile = resolveTenantProfile(existingTenant as UserDTO & UserTenantFields, existingResident);

    const tenantCompanyId = resolveCompanyIdFromTenantContext(existingTenant, existingResident);
    if (tenantCompanyId && tenantCompanyId !== String(linkedSecurityCompany._id)) {
      return res.status(403).json({ message: "Tenant does not belong to your security company." });
    }

    const body = req.body as {
      address: string;
      cellNumber: string;
      communityComplexId?: string;
      communityId?: string;
      communityResidenceType?: "complex" | "house";
      complexId?: string;
      complexName?: string;
      emailAddress: string;
      idNumber?: string;
      name: string;
      residenceType: "community" | "complex";
      surname: string;
      vehicles?: { color?: string; make: string; model: string; reg: string; }[];
    };

    const previousResidenceType = String(existingTenantProfile.residenceType ?? "") as "community" | "complex";
    const previousAddress = String(existingTenantProfile.address ?? "");
    const previousComplexId = String((existingTenantProfile.complex as null | undefined | { _id?: unknown })?._id ?? "");

    const normalizedEmail = body.emailAddress.trim().toLowerCase();
    const duplicateUser = await userSchema.findOne({ _id: { $ne: tenantId }, emailAddress: normalizedEmail }).select({ _id: 1 }).lean();
    if (duplicateUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    const duplicateResident = await residentSchema.findOne({
      _id: { $ne: existingResident?._id ?? null },
      emailAddress: normalizedEmail,
      userId: { $ne: tenantId },
    }).select({ _id: 1 }).lean();
    if (duplicateResident) {
      return res.status(409).json({ message: "Resident with this email already exists." });
    }

    const trimmedAddress = body.address.trim();
    let linkedComplex: null | { _id: unknown; address?: string; gatedCommunityName?: null | string; name?: string } = null;
    let linkedGatedCommunity: null | { _id: unknown; name?: string } = null;
    let communityIdValue = "";
    let communityResidenceTypeValue = "";
    let communityComplexIdValue = "";
    let unitNumberValue = "";
    let houseNumberValue = "";

    if (body.residenceType === "complex") {
      if (!body.complexId || !ObjectId.isValid(body.complexId)) {
        return res.status(400).json({ message: "Valid complex is required for complex residence." });
      }

      linkedComplex = await complexSchema.findById(body.complexId).select({ _id: 1, gatedCommunityName: 1, name: 1 }).lean();
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

        const communityComplex = await complexSchema.findById(body.communityComplexId).select({ _id: 1, gatedCommunityName: 1, name: 1 }).lean();
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
          address: trimmedAddress,
          cellNumber: body.cellNumber.trim(),
          communityComplexId: communityComplexIdValue,
          communityId: communityIdValue,
          communityResidenceType: communityResidenceTypeValue,
          complex: linkedComplex
            ? {
                _id: linkedComplex._id,
                gatedCommunityName: linkedComplex.gatedCommunityName ?? "",
                name: linkedComplex.name ?? "",
              }
            : null,
          emailAddress: normalizedEmail,
          gatedCommunity: linkedGatedCommunity
            ? {
                _id: linkedGatedCommunity._id,
                name: linkedGatedCommunity.name ?? "",
              }
            : null,
          houseNumber: houseNumberValue,
          idNumber: body.idNumber?.trim() || undefined,
          name: body.name.trim(),
          residenceType: body.residenceType,
          securityCompany: linkedSecurityCompany
            ? {
                _id: linkedSecurityCompany._id,
                name: linkedSecurityCompany.name,
              }
            : null,
          surname: body.surname.trim(),
          unitNumber: unitNumberValue,
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
          gatedCommunityId: previousComplexId ? "" : String(existingTenantProfile.communityId ?? ""),
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
                address: String(linkedComplex.address ?? ""),
                name: String(linkedComplex.name ?? ""),
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

    const updatedResident = existingResident
      ? await residentSchema.findById(existingResident._id).exec()
      : null;

    await syncTenantVehiclesForUser(
      {
        _id: updatedTenant._id,
        cellNumber: updatedTenant.cellNumber,
        emailAddress: updatedTenant.emailAddress,
        name: updatedTenant.name,
        surname: updatedTenant.surname,
      },
      body.vehicles,
    );

    return res.status(200).json({
      message: "Tenant updated successfully!",
      payload: {
        resident: updatedResident,
        user: updatedTenant,
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
    const tenantProfile = resolveTenantProfile(tenant as UserDTO & UserTenantFields, tenantResident);

    const tenantCompanyId = resolveCompanyIdFromTenantContext(tenant, tenantResident);
    if (tenantCompanyId && tenantCompanyId !== String(linkedSecurityCompany._id)) {
      return res.status(403).json({ message: "Tenant does not belong to your security company." });
    }

    const tenantUsesUnit =
      tenantProfile.residenceType === "complex" ||
      tenantProfile.residenceType === "community";
    if (tenantUsesUnit) {
      await unlinkTenantFromUnit(
        String(tenant._id ?? ""),
        {
          complexId: String((tenantProfile.complex as null | undefined | { _id?: unknown })?._id ?? ""),
          gatedCommunityId: String(tenantProfile.communityId ?? ""),
        },
        String(tenantProfile.address ?? "")
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
        resident: deletedResident,
        user: deletedTenant,
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

    const body = req.body as { assignedCommunities?: string[]; assignedComplexes?: string[]; };
    const companyAssignment = findCompanyAssignmentForUser(linkedSecurityCompany, String(employee._id ?? ""));
    const assignedComplexes = Array.isArray(body.assignedComplexes)
      ? normalizeStringList(body.assignedComplexes)
      : normalizeStringList(companyAssignment?.assignedComplexes);

    const assignedCommunities = Array.isArray(body.assignedCommunities)
      ? normalizeStringList(body.assignedCommunities)
      : normalizeStringList(companyAssignment?.assignedCommunities);

    await upsertCompanyEmployeeAssignment(String(linkedSecurityCompany._id), {
      assignedCommunities,
      assignedComplexes,
      contractEndDate: companyAssignment?.contractEndDate ?? null,
      contractStartDate: companyAssignment?.contractStartDate ?? null,
      createdBy: companyAssignment?.createdBy ?? managerEmail,
      position: companyAssignment?.position,
      status: companyAssignment?.status,
      userId: String(employee._id),
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
          assignedCommunities: "",
          assignedComplexes: "",
          employeeContracts: "",
        },
      },
      { new: true }
    ).select({}).exec();

    const responsePayload = updatedEmployee
      ? {
          ...updatedEmployee.toObject(),
          assignedCommunities,
          assignedComplexes,
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
      assignedComplexId?: string;
      assignedComplexName?: string;
      assignedGatedCommunityName?: string;
      cellNumber: string;
      contractEndDate?: string;
      contractStartDate?: string;
      emailAddress: string;
      name: string;
      position: string;
      status?: "active" | "inactive";
      surname: string;
    };

    const normalizedEmail = body.emailAddress.trim().toLowerCase();
    const duplicateUser = await userSchema.findOne({ _id: { $ne: employeeId }, emailAddress: normalizedEmail }).select({ _id: 1 }).lean();
    if (duplicateUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    const normalizedPosition = (body.position ?? "").toLowerCase().replace(/[^a-z]/g, "");
    const isAdminGuard = normalizedPosition.includes("admin");
    const employeePosition: "admin-Guard" | "Guard" = isAdminGuard ? "admin-Guard" : "Guard";

    const existingCompanyAssignment = findCompanyAssignmentForUser(linkedSecurityCompany, String(employeeId));

    const updatedContract = {
      contractEndDate: body.contractEndDate
        ? new Date(body.contractEndDate)
        : (existingCompanyAssignment?.contractEndDate ?? null),
      contractStartDate: body.contractStartDate
        ? new Date(body.contractStartDate)
        : (existingCompanyAssignment?.contractStartDate ?? new Date()),
      createdBy: existingCompanyAssignment?.createdBy ?? managerEmail,
      position: employeePosition,
      securityCompany: {
        _id: linkedSecurityCompany._id,
        name: linkedSecurityCompany.name,
      },
      status: body.status ?? "active",
    };

    const updatedEmployee = await userSchema.findByIdAndUpdate(
      employeeId,
      {
        $set: {
          cellNumber: body.cellNumber.trim(),
          complex: body.assignedComplexId
            ? {
                _id: body.assignedComplexId,
                name: body.assignedComplexName ?? "",
              }
            : null,
          emailAddress: normalizedEmail,
          movedOut: (body.status ?? "active") === "inactive",
          name: body.name.trim(),
          securityCompany: {
            _id: linkedSecurityCompany._id,
            name: linkedSecurityCompany.name,
          },
          surname: body.surname.trim(),
          type: isAdminGuard ? ["security", "admin"] : ["security"],
        },
        $unset: {
          assignedCommunities: "",
          assignedComplexes: "",
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
      assignedCommunities: nextAssignedCommunities,
      assignedComplexes: nextAssignedComplexes,
      contractEndDate: updatedContract.contractEndDate ?? null,
      contractStartDate: updatedContract.contractStartDate ?? null,
      createdBy: updatedContract.createdBy,
      position: employeePosition,
      status: body.status ?? "active",
      userId: String(employeeId),
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
    const body = req.body as { emailAddress: string; password: string };
    const normalizedEmail = String(body.emailAddress ?? "").trim().toLowerCase();

    const user = await userSchema
      .findOne<UserDTO>({
        emailAddress: normalizedEmail,
      })
      .select({})
      .exec();

    if (!user) return res.status(401).json({ message: "Invalid login details!" });

    const isValidPassword = await bcrypt.compare(body.password, user.password as unknown as string);

    if (!isValidPassword) return res.status(401).json({ message: "Invalid login details" });

    const token = GenerateJWT(user.emailAddress, user.type);

    if (VerifyToken(token)) {
      const linkedSecurityCompany = await resolveSecurityCompanyForUser(user);
      const resolvedAssignments = resolveUserAssignments(user, linkedSecurityCompany);
      const resolvedEmployeeContracts = resolveUserEmployeeContracts(user, linkedSecurityCompany);
      const userRoles = Array.isArray(user.type) ? user.type : [];
      const isTenant = userRoles.includes("tenant") || userRoles.includes("user");
      const tenantResident = isTenant ? await resolveResidentForTenantUser(user) : null;
      const tenantProfile = resolveTenantProfile(user as UserDTO & UserTenantFields, tenantResident);
      const tenantVehicles = isTenant
        ? await vehicleSchema.find({ "user._id": { $in: [String(user._id ?? ""), user._id] } }).lean()
        : [];
      const normalizedTenantVehicles = normalizeTenantVehicles(tenantVehicles).map((vehicle) => ({
        color: vehicle.color ?? "",
        make: vehicle.make,
        model: vehicle.model,
        reg: vehicle.reg,
      }));
      const nonTenantUser = user as UserDTO & UserTenantFields;
      
      return res.status(200).json({
        message: "Logged in successfully",
        payload: {
          token: token,
          type: user.type,
          user: {
            _id: user._id,
            address: isTenant ? (tenantProfile.address ?? "") : (nonTenantUser.address ?? ""),
            assignedCommunities: resolvedAssignments.assignedCommunities,
            assignedComplexes: resolvedAssignments.assignedComplexes,
            cellNumber: user.cellNumber,
            communityComplexId: isTenant ? (tenantProfile.communityComplexId ?? "") : (nonTenantUser.communityComplexId ?? ""),
            communityId: isTenant ? (tenantProfile.communityId ?? "") : (nonTenantUser.communityId ?? ""),
            communityResidenceType: isTenant ? (tenantProfile.communityResidenceType ?? "") : (nonTenantUser.communityResidenceType ?? ""),
            complex: isTenant ? (tenantProfile.complex ?? null) : (user.complex ?? null),
            emailAddress: user.emailAddress,
            employeeContracts: resolvedEmployeeContracts,
            gatedCommunity: isTenant ? (tenantProfile.gatedCommunity ?? null) : (nonTenantUser.gatedCommunity ?? null),
            houseNumber: isTenant ? (tenantProfile.houseNumber ?? "") : (nonTenantUser.houseNumber ?? ""),
            name: user.name,
            profilePhoto: user.profilePhoto,
            residenceType: isTenant ? (tenantProfile.residenceType ?? "") : (nonTenantUser.residenceType ?? ""),
            securityCompany: isTenant
              ? null
              : linkedSecurityCompany
              ? {
                  _id: linkedSecurityCompany._id,
                  contactNumber: linkedSecurityCompany.contactNumber,
                  contract: linkedSecurityCompany.contract ?? [],
                  email: linkedSecurityCompany.email,
                  name: linkedSecurityCompany.name,
                }
              : (user.securityCompany ?? null),
            surname: user.surname,
            type: user.type,
            unitNumber: isTenant ? (tenantProfile.unitNumber ?? "") : (nonTenantUser.unitNumber ?? ""),
            vehicles: isTenant ? normalizedTenantVehicles : [],
          },
        },
      });
    }

    return res.status(500).json({ message: "Error issuing valid token signature. Please try again later." });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
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
    //Update to validate user utility
    if (!req.get("id")) return res.status(400).json({ message: "Bad Request! Invalid request." });

    const _id = ValidObjectId(req.get("id") as unknown as string);

    const user = await userSchema.findById(_id).exec();

    if (user) {
      return res.status(200).json({message: "Successfully retrieved User!", payload: user});
    } else {
      return res.status(404).json({message: "User details not found!"});
    }
  } catch {
    return res.status(500).json({message: "Internal Server Error"});
  }
});

userRouter.get(
  "/",
  /*AuthMiddleware,*/ async (req, res) => {
    try {
      // if (!isValidObjectID(req.params.id as string)) return res.status(400).send("Bad Request! Invalid Id");
      const users = await userSchema.find({}).select({}).exec();

      if (users.length > 0) {
        return res.status(200).json({ message: "Users found", payload: users });
      } else {
        return res.status(404).json({ message: "Users not found!" });
      }
    } catch {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

export default userRouter;
