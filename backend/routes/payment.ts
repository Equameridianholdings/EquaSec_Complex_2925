import complexSchema from "#db/complexSchema.js";
import gatedCommunitySchema from "#db/gatedCommunity.js";
import unitSchema from "#db/unitSchema.js";
import userSchema from "#db/userSchema.js";
import { paymentDTO } from "#interfaces/paymentDTO.js";
import { unitDTO } from "#interfaces/unitDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { createHash } from "crypto";
import { Request, Response, Router } from "express";

const paymentRouter = Router();

paymentRouter.use(AuthMiddleware);

paymentRouter.post("/:passphrase", async (req: Request, res: Response) => {
  const email = res.get("email");
  const { passphrase } = req.params;
  const passPhrase = passphrase as string;

  const body = req.body as paymentDTO;
  try {
    const user = await userSchema.findOne({ emailAddress: email }).exec();
    const unit = await unitSchema.findOne<unitDTO>({ users: user?._id.toString() }).exec();
    const complexes = await complexSchema.find({}).select({}).exec();
    const gatedCommunities = await gatedCommunitySchema.find({}).select({}).exec();

    if (unit !== null) {
      if (unit.complex) {
        body.amount = complexes.find((x) => x._id.toString() === unit.complex?._id)?.price.toString() as unknown as string;
      } else {
        body.amount = gatedCommunities.find((x) => x._id.toString() === unit.gatedCommunity?._id)?.price?.toString() as unknown as string;
      }
    }
  } catch (error: unknown) {
    res.status(500).json({ message: `Internal Server Error; ${error as string}` });
    return;
  }

  let pfOutput = "";
  for (const [key, value] of Object.entries(body)) {
    if (value) {
      const val = value as string;
      pfOutput += `${key}=${encodeURIComponent(val.trim()).replace(/%20/g, "+")}&`;
    }
  }

  let getString = pfOutput.slice(0, -1);
  if (passPhrase) {
    getString += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, "+")}`;
  }

  const hash = createHash("md5").update(getString).digest("hex");
  const uri = getString + `&signature=${hash.trim()}`;

  return res.status(200).json({ message: "Successfully generated signature", payload: uri });
});

export default paymentRouter;
