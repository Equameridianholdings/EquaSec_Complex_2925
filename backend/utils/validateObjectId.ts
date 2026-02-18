import { param } from "express-validator/lib/middlewares/validation-chain-builders.js";
import { ObjectId } from "mongodb";

const validateObjectId = param("id").custom((value: string) => {
    if (ObjectId.isValid(value))
        return new ObjectId(value);

    throw new Error("Invalid object Id");
})

export default validateObjectId;