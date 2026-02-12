import { ObjectId } from "mongodb";

const isValidObjectID = (_id: string): boolean => {
    return ObjectId.isValid(_id);
}

export default isValidObjectID;