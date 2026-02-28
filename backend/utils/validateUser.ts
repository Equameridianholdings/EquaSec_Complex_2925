import userSchema from "#db/userSchema.js";
import { UserDTO } from "#interfaces/userDTO.js";

const validateUser = async (email: string) => {
  return userSchema.findOne<UserDTO>({emailAddress: email}).exec();
};

export default validateUser;
