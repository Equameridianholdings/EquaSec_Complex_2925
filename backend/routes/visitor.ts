import logSchema from "#db/logsSchema.js";
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

visitorRouter.use(AuthMiddleware);

visitorRouter.get("/security/", validateObjectId, async (req, res) => {
  const guardId = req.get("id");
  if (!guardId) {
    console.log('[GET /visitor/security] Missing id header');
    return res.status(400).json({ message: "Bad Request! Invalid request." });
  }

  const _id = ValidObjectId(guardId as unknown as string);

  try {
    //load visitors based on security guard => complex specific visitors
    const security = await userSchema.findById<UserDTO>(_id);
    // console.log('[GET /visitor/security] Guard ID:', guardId);
    // console.log('[GET /visitor/security] Security user:', security);

    if (security == null) {
      console.log('[GET /visitor/security] Security company not found for ID:', guardId);
      res.status(404).json({ message: "Security company not found!" });
      return;
    }

    const complexId = security.complex?._id || security.complex?.complexId || security.complexId;
    const visitorQuery = { "user.complexId": String(complexId) };
    console.log('[GET /visitor/security] Visitor query:', visitorQuery);
    const visitors = await visitorShema.find<visitorDTO>(visitorQuery).exec();
    console.log('[GET /visitor/security] Visitors found:', visitors.length);
    // Log each visitor vehicle for debugging registration/color fields
    visitors.forEach((v, idx) => {
      if (v.vehicle) {
        console.log(`[GET /visitor/security] Visitor #${idx} vehicle:`, v.vehicle);
      }
    });

    if (visitors.length == 0) {
      console.log('[GET /visitor/security] No visitors found for complexId:', complexId);
      res.status(404).json({ message: "No visitors today!" });
      return;
    }

    res.status(200).json(visitors);
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
    const visitorQuery = { "user.emailAddress": email };
    const visitors = await visitorShema.find<visitorDTO>(visitorQuery).select({}).exec();

    if (visitors.length == 0) {
      res.status(200).json({ message: "No visitors today!", payload: [] });
      return;
    }

    res.status(200).json({ message: "Successfully loaded visitors", payload: visitors });
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
    const userToAssign = req.body.user ? req.body.user : loggedInUser;

    // Ensure user.unit.complex is set to the correct complex name
    if (userToAssign?.unit) {
      if (!userToAssign.unit.complex && userToAssign.complex?.name) {
        userToAssign.unit.complex = userToAssign.complex.name;
      }
    }

    const visitor: visitorDTO = {
      ...(req.body as visitorDTO),
      code: Code_Generator(),
      expiry: new Date(new Date().setHours(new Date().getHours() + 24)),
      user: userToAssign,
      validity: true,
      vehicle: req.body.vehicle
        ? {
            color: req.body.vehicle.color || '',
            makeModel: req.body.vehicle.makeModel || '',
            registration: req.body.vehicle.registration || '',
          }
        : undefined,
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

    if (visitor.expiry && visitor.expiry < new Date()) {
      res.status(400).json({ message: "Bad Request! Visitation expired." });
      return;
    }

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Bad Request! Invalid Onject id" });
      return;
    }

    const objectId = new ObjectId(id);
    const securityQuery = { _id: objectId };
    const security = await userSchema.findOne<UserDTO>(securityQuery).exec();

    if (security === null) {
      res.status(404).json({ message: "Security company not found!" });
      return;
    }

    visitor.validity = access === "true" ? true : false;
    visitor.access = visitor.validity ? true : false;

    const log = new logSchema({ date: new Date(), guard: security, visitor: visitor });
    await log.save();

    res.status(200).json({ message: "Access Granted!", payload: visitor });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

export default visitorRouter;
