import logSchema from "#db/logsSchema.js";
import userSchema from "#db/userSchema.js";
import visitorShema from "#db/visitorSchema.js";
import { UserDTO } from "#interfaces/userDTO.js";
import { visitorDTO } from "#interfaces/visitorDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import Code_Generator from "#utils/code_generator.js";
import isValidObjectID from "#utils/isValidObjectID.js";
import { Router } from "express";
import { ObjectId } from "mongodb";

const visitorRouter = Router();

visitorRouter.use(AuthMiddleware);

visitorRouter.get("/:id", AuthMiddleware, async (req, res) => {
    try {
        //load visitors based on security guard => complex specific visitors
        const id = req.params.id as string;

        if (!isValidObjectID(id)) {
            res.status(400).json({ message: "Bad Request! Invalid Object id" });
            return;
        }
            
        const objectId = new ObjectId(id);
        const securityQuery = { _id: objectId };        
        const security = await userSchema.findOne<UserDTO>(securityQuery);

        if (security == null) {
            res.status(404).json({ message: "Security company not found!"});
            return;
        }

        const visitorQuery = { "user.unit.complex": security.complex?.name };
        const visitors = await visitorShema.find<visitorDTO>(visitorQuery);

        if (visitors.length == 0) {
            res.status(404).json({ message: "No visitors today!" });
            return;
        }

        res.status(200).json(visitors);
        return;
    } catch {
        res.status(500).json({message: "Internal Server Error!"});
        return;
    }
});

visitorRouter.post("/", async (req, res) => {
    try {
        const visitor: visitorDTO = {
            ...req.body as visitorDTO,
            code: Code_Generator(),
            expiry: new Date(new Date().setHours(new Date().getHours() + 24)),
        };

        const newVisitor = new visitorShema(visitor);
        await newVisitor.save();

        res.status(201).json({message: "Visitor successfully added!", payload: newVisitor});
        return;
    } catch {
        res.status(500).json("Internal Server Error!");
    }
});

visitorRouter.patch("/grant/:id/:access", async (req, res) => {
    try {
        // Access Granted or Denied Logic
        const { access, id } = req.params;

        const visitor: visitorDTO = req.body as visitorDTO;

        if (visitor.expiry && visitor.expiry < new Date()) {
            res.status(400).json({message: "Bad Request! Visitation expired."});
            return;
        }

        if (!isValidObjectID(id)) {
            res.status(400).json({message: "Bad Request! Invalid Onject id"});
            return;
        }
            
        const objectId = new ObjectId(id);
        const securityQuery = { _id: objectId };
        const security = await userSchema.findOne<UserDTO>(securityQuery);

        if (security === null) {
            res.status(404).json({ message: "Security company not found!"});
            return;
        }
        
        visitor.validity = (access === 'true') ? true : false;
        visitor.access = (visitor.validity) ? true : false;

        const log = new logSchema({ date: new Date(), guard: security, visitor: visitor});
        await log.save();

        res.status(200).json({message: "Access Granted!", payload: visitor});
        return;
    } catch {
        res.status(500).json({message: "Internal Server Error!"});
        return;
    }
});

export default visitorRouter;