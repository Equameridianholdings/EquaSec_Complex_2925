import subTenantSchema from "#db/subtenantSchema.js";
import { subTenantDTO } from "#interfaces/subtenantDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import isValidObjectID from "#utils/isValidObjectID.js";
import { Router } from "express";
import { ObjectId } from "mongodb";

const subTenantRouter = Router();

subTenantRouter.use(AuthMiddleware);

subTenantRouter.get("/", async (req, res) => {
    try {
        const subTenants = await subTenantSchema.find({});

        if (subTenants.length === 0) {
            res.status(404).json({ message: "No sub-tenants found!" });
            return;
        }

        res.status(200).json(subTenants);
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
});

subTenantRouter.get("/:id", async (req, res) => {
    const _id = req.params.id;
    if (!isValidObjectID(_id)) {
        res.status(400).json({ message: "Bad request! Invalid Id." });
        return;
    }

    const subTenantQuery = {
        "user._id": new ObjectId(_id),
    };

    try {
        const subTenants = await subTenantSchema.find(subTenantQuery);

        if (subTenants.length === 0) {
            res.status(404).json({ message: "No sub-tenants found!" });
            return;
        }

        res.status(200).json(subTenants);
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
});

subTenantRouter.post("/", async (req, res) => {
    const subtenant = req.body as subTenantDTO;
    try {
        const newSubTenant = new subTenantSchema(subtenant);
        await newSubTenant.save();

        res.status(201).json({ message: "Sub-Tenant successfully added!", payload: newSubTenant });
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

subTenantRouter.patch("/:id", async (req, res) => {
    const _id = req.params.id;
    if (!isValidObjectID(_id)) {
        res.status(400).json({ message: "Bad request! Invalid Id." });
        return;
    }

    const subTenantQuery = {
        $set: req.body as object,
    };
    try {
        const updatedSubTenant = await subTenantSchema.findByIdAndUpdate(new ObjectId(_id), subTenantQuery, { new: true });

        if (updatedSubTenant === null) {
            res.status(404).json({ message: "Sub-Tenant does not exist!" });
            return;
        }

        res.status(200).json({ message: "Sub-Tenant successfully updated!", payload: updatedSubTenant });
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
});

subTenantRouter.delete("/:id", async (req, res) => {
    const _id = req.params.id;
    if (!isValidObjectID(_id)) {
        res.status(400).json({ message: "Bad request! Invalid Id." });
        return;
    }

    try {
        const deletedSubTenant = await subTenantSchema.findByIdAndDelete(new ObjectId(_id));

        if (deletedSubTenant === null) {
            res.status(404).json({ message: "Sub-Tenant does not exist!" });
            return;
        }

        res.status(200).json({ message: "Sub-Tenant successfully deleted", payload: deletedSubTenant });
        return;
    } catch {
        res.status(500).json({ message: "Internal Server Error"});
        return;
    }
});

export default subTenantRouter;