import { ObjectId } from "mongodb";
import { Error, isValidObjectId } from "mongoose";

export const ValidObjectId = (id: string) => {
    if (isValidObjectId(id)) return new ObjectId(id);

    throw new Error("Invalid Object Id");
};