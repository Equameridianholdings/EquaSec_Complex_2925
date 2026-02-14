import userSchema from "#db/userSchema.js";
import { UserDTO } from "#interfaces/userDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import GenerateJWT from "#utils/generateJWT.js";
import isValidObjectID from "#utils/isValidObjectID.js";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { validationResult } from "express-validator/lib/validation-result.js";
import { ObjectId } from "mongodb";


const userRouter = Router();

//Register a new user
userRouter.post("/register",
  async (req, res) => {    
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array()});
    
    const user: UserDTO = req.body as UserDTO;

    try {
      user.salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(user.password as unknown as string, user.salt);

      user.password = hashPassword;
      
      const newUser = new userSchema(user);
      await newUser.save();

      return res.status(201).json(newUser);
    } catch {
      return res.status(500).send("Internal Server Error");
    }
  });

//Login a new user
userRouter.get("/login", async (req, res) => {
  try {
    const body = req.body as UserDTO;
    const user = await userSchema.findOne({
      emailAddress: body.emailAddress,
    });

    if (!user) {
      return res.status(401).send("Invaild login details!");
    }

    const hashedPassword = bcrypt.hash(body.password as unknown as string, user.salt);
    const isValidPassword = await bcrypt.compare(user.password, await hashedPassword);

    if (!isValidPassword) return res.status(401).send("Invalid login details");

    //Issue jwt
    const token = GenerateJWT(body);
    return res.status(200).json({message: "Logged in successfully", token: token}); //return jwt token
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

//Deactivate user
userRouter.delete("/deactivate/:id", AuthMiddleware, async (req, res) => {
  try {
    if (!isValidObjectID(req.params.id as string)) return res.status(400).send("Bad Request! Invalid Id");

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
userRouter.get("/:id", AuthMiddleware, async (req, res) => {
    try {
        if (!isValidObjectID(req.params.id as string)) return res.status(400).send("Bad Request! Invalid Id");

        const objectId = new ObjectId(req.params.id as string);
        const user = await userSchema.findOne({_id: objectId});
        
        if (user) {
            return res.status(200).json(user);
        } else {
            return res.status(404).send("User details not found!");
        }
    } catch {
        return res.status(500).send("Internal Server Error");
    }
});

export default userRouter;