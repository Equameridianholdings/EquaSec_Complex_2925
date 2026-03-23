import complexSchema from "#db/complexSchema.js";
import gatedCommunitySchema from "#db/gatedCommunity.js";
import unitSchema from "#db/unitSchema.js";
import userSchema from "#db/userSchema.js";
import { ITNPayload, paymentDTO } from "#interfaces/paymentDTO.js";
import { unitDTO } from "#interfaces/unitDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { createHash } from "crypto";
import { lookup, LookupAddress } from "dns";
import { Request, Response, Router } from "express";
const paymentRouter = Router();

paymentRouter.use(AuthMiddleware);

const pfValidSignature = (pfData: ITNPayload, pfParamString: string, pfPassphrase: string) => {
  // Calculate security signature
  if (pfPassphrase !== "") {
    pfParamString += `&passphrase=${encodeURIComponent(pfPassphrase.trim()).replace(/%20/g, "+")}`;
  }

  const signature = createHash("md5").update(pfParamString).digest("hex");
  return pfData.signature === signature;
};

async function ipLookup(domain: string) {
  return new Promise((resolve, reject) => {
    lookup(domain, { all: true }, (err: NodeJS.ErrnoException | null, address: LookupAddress[]) => {
      if (err) {
        reject(err);
      } else {
        const addressIps = address.map(function (item) {
          return item.address;
        });
        resolve(addressIps);
      }
    });
  });
}

const pfValidIP = async (req: Request) => {
  const validHosts = ["www.payfast.co.za", "sandbox.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za"];

  let validIps: unknown[] = [];
  const pfIp = req.headers["x-forwarded-for"] ?? req.ip;

  try {
    for (const key of validHosts) {
      const ips = await ipLookup(key);
      validIps = [...validIps, ...(ips as unknown[])];
    }
  } catch (err) {
    console.error(err);
  }

  const uniqueIps = [...new Set(validIps)];

  if (uniqueIps.includes(pfIp)) {
    return true;
  }
  return false;
};

const pfValidPaymentData = (cartTotal: string, pfData: ITNPayload) => {
  return Math.abs(parseFloat(cartTotal) - parseFloat(pfData.amount_gross.toString())) <= 0.01;
};

const pfValidServerConfirmation = async (pfHost: string, pfParamString: string) => {
  const result = await fetch(`https://${pfHost}/eng/query/validate`, {
    body: JSON.stringify(pfParamString),
    method: "POST",
  })
    .then(async (res) => {
      return await res.json();
    })
    .catch((error: unknown) => {
      console.error(error);
    });

  return result === "VALID";
};

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

paymentRouter.post("/", async (req: Request, res: Response) => {
  const pfData = JSON.parse(JSON.stringify(req.body as unknown)) as ITNPayload;
  console.log(pfData);
  
  let pfParamString = "";
  for (const [key, value] of Object.entries(pfData)) {
    if (key !== "signature") {
      pfParamString += `${key}=${encodeURIComponent((value as unknown as string).trim()).replace(/%20/g, "+")}&`;
    }
  }

  // Remove last ampersand
  pfParamString = pfParamString.slice(0, -1);
  const PASSPHRASE = process.env.PASSPHRASE;

  const check1 = pfValidSignature(pfData, pfParamString, PASSPHRASE as unknown as string);
  const check2 = pfValidIP(req);
  const check3 = pfValidPaymentData("99", pfData);
  const check4 = pfValidServerConfirmation("www.payfast.co.za", pfParamString);

  if (check1 && await check2 && check3 && await check4) {
    // All checks have passed, the payment is successful
    return res.status(200);
  } else {
    // Some checks have failed, check payment manually and log for investigation
    return res.status(400);
  }
});

export default paymentRouter;
