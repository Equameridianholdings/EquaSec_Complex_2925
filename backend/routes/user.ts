import userSchema from "#db/userSchema.js";
import { Router } from "express";


const userRouter = Router();

//Register a new user
userRouter.post("/register", async (req, res) => {
  try {    
    const newuser = new userSchema(req.body);
    await newuser.save();

    res.status(201).json(newuser);
  } catch {
    res.status(500).send("Internal Server Error");
  }
});

//Login a new user
userRouter.get("/login", async (req, res) => {
  try {
    const user = await userSchema.findOne({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      emailAddress: req.body.emailAddress as unknown as string,
    });

    if (user) {
      res.status(200).json(user);
    } else {
      res.status(400).send("Invaild login details!");
    }
  } catch {
    res.status(500).send("Internal Server Error");
  }
});

//Deactivate user
userRouter.delete("/deactivate", async (req, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = await userSchema.findOneAndDelete({ id: req.body._id });

    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).send("User details not found!");
    }
  } catch {
    res.status(500).send("Internal Server Error");
  }
});

//Update profile
userRouter.patch("/update", async (req, res) => {
  try {
    const user = await userSchema.findByIdAndUpdate(req.body);

    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).send("User details not found!");
    }
  } catch {
    res.status(500).send("Internal Server Error");
  }
});

//Fetch user details
userRouter.get("/:id", async (req, res) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const user = await userSchema.findOne({id: req.body.id});
        
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).send("User details not found!");
        }
    } catch {
        res.status(500).send("Internal Server Error");
    }
});

export default userRouter;