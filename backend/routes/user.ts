import userSchema from "#db/userSchema.js";
import { complexDTO } from "#interfaces/complexDTO.js";
import { userBodyValidation, UserDTO } from "#interfaces/userDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
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
    isLength: {
      errorMessage: "Incorrect password length",
      options: {
        max: 7,
        min: 6,
      },
    },
  },
};
userRouter.post("/login", checkSchema(loginBodyValidation), validateSchema, async (req: Request, res: Response) => {
  try {
    const body = req.body as { emailAddress: string; password: string; };

    const user = await userSchema.find<UserDTO>({
      emailAddress: body.emailAddress,
    }).select({}).exec();
    
    if (user.length === 0) return res.status(401).json({message: "Invaild login details!"});

    const hashedPassword = await bcrypt.hash(body.password as unknown as string, user[0].salt as unknown as string);
    const isValidPassword = user[0].password === hashedPassword;

    if (!isValidPassword) return res.status(401).json({message: "Invalid login details"});

    //Issue jwt
    const token = GenerateJWT(user[0].emailAddress, user[0].type);
    
    if (VerifyToken(token)) return res.status(200).json({ message: "Logged in successfully", payload: { token: token, type: user[0].type } }); //return jwt token

    return res.status(500).json({message: "Error issuing valid token signature. Please try again later."});
  } catch {
    return res.status(500).json({message: "Internal Server Error"});
  }
});

//Deactivate user
userRouter.delete("/deactivate/:id", AuthMiddleware, async (req, res) => {
  try {
    // if (!isValidObjectID(req.params.id as string)) return res.status(400).send("Bad Request! Invalid Id");

    const objectId = new ObjectId(req.params.id as string);
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
    const user = await userSchema.findByIdAndUpdate(req.body);

    if (user) {
      return res.status(200).json(user);
    } else {
      return res.status(404).send("User details not found!");
    }
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

//Fetch user details
userRouter.get("/current", AuthMiddleware, async (req, res) => {
  try {
    //Update to validate user utility
    const objectId = new ObjectId(req.get('id') as unknown as string);
    const user = await userSchema.findOne({ _id: objectId });

    if (user) {
      return res.status(200).json(user);
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
    const users = await userSchema.find({}).select({}).exec();

    if (users.length > 0) {
      return res.status(200).json({message: "Users found", payload: users});
    } else {
      return res.status(404).json({message: "Users not found!"});
    }
  } catch {
    return res.status(500).json({message: "Internal Server Error"});
  }
});

export default userRouter;
