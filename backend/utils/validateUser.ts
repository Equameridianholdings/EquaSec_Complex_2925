import userSchema from "#db/userSchema.js";
import { UserDTO } from "#interfaces/userDTO.js";
import { ObjectId } from "mongodb";
import { isValidObjectId } from "mongoose";

const validateUser = async (_id: string) => {
    if (!isValidObjectId(_id)) return null;

    const id = new ObjectId(_id);

    return userSchema.findById<UserDTO>(id).exec();
};

export default validateUser;