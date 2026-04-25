import complexSchema from "#db/complexSchema.js";
import gatedCommunitySchema from "#db/gatedCommunity.js";
import invoiceSchema from "#db/invoiceSchema.js";
import paymentSchema from "#db/paymentSchema.js";
import unitSchema from "#db/unitSchema.js";
import userSchema from "#db/userSchema.js";
import { complexDTO } from "#interfaces/complexDTO.js";
import { invoiceDTO } from "#interfaces/invoiceDTO.js";
import { ITNPayload, paymentDTO, paymentsSchemaDto } from "#interfaces/paymentDTO.js";
import { cancelReturnDTO, subscriptionDTO } from "#interfaces/subscriptionDTO.js";
import { unitDTO } from "#interfaces/unitDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import payFastMiddleware from "#middleware/payfast.middleware.js";
import { createHash } from "crypto";
import { lookup, LookupAddress } from "dns";
import { Request, Response, Router } from "express";

const paymentRouter = Router();
const PAYFAST_API = process.env.PAYFAST_API;
const MERCHANT_ID = process.env.MERCHANT_ID as unknown;

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

  console.log(pfIp);
  console.log(Array.isArray(pfIp))
  
  if (Array.isArray(pfIp)) {
    pfIp.forEach((ip) => {
      if (uniqueIps.includes(ip)) {
        return true;
      }
    });
  } else {
    if (uniqueIps.includes(pfIp)) {
      return true;
    }
  }

  return false;
};

paymentRouter.post("/:passphrase", AuthMiddleware, async (req: Request, res: Response) => {
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

paymentRouter.post("/subscribe/:passphrase", AuthMiddleware, async (req: Request, res: Response) => {
  const email = res.get("email");
  const { passphrase } = req.params;
  const passPhrase = passphrase as string;
  const body = req.body as subscriptionDTO;

  try {
    const user = await userSchema.findOne({ emailAddress: email }).exec();
    const unit = await unitSchema.findOne<unitDTO>({ users: user?._id.toString() }).exec();
    const complexes = await complexSchema.find({}).select({}).exec();
    const gatedCommunities = await gatedCommunitySchema.find({}).select({}).exec();

    if (unit !== null) {
      let charge;

      if (unit.complex) {
        charge = complexes.find((x) => x._id.toString() === unit.complex?._id)?.price;
      } else {
        charge = gatedCommunities.find((x) => x._id.toString() === unit.gatedCommunity?._id)?.price;
      }

      body.amount = charge as unknown as string;
      body.recurring_amount = charge as unknown as string;
    }
  } catch (error: unknown) {
    res.status(500).json({ message: `Internal Server Error; ${error as string}` });
    return;
  }

  let pfOutput = "";
  for (const [key, value] of Object.entries(body)) {
    if (value) {
      const val = value as string;
      pfOutput += `${key}=${encodeURIComponent(val).replace(/%20/g, "+")}&`;
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

paymentRouter.post("/", payFastMiddleware, async (req: Request, res: Response) => {
  const pfData = req.body as Partial<ITNPayload>;

  const check = pfValidIP(req);

  if (await check) {
    // All checks have passed, the payment is successful
    const newPayment: Partial<paymentsSchemaDto> = {
      amount_fee: Number.parseFloat(pfData.amount_fee as unknown as string),
      amount_gross: Number.parseFloat(pfData.amount_gross as unknown as string),
      amount_net: Number.parseFloat(pfData.amount_net as unknown as string),
      date: new Date(),
      email_address: pfData.email_address,
      item_name: pfData.item_name,
      name_first: pfData.name_first,
      name_last: pfData.name_last,
      payment_id: pfData.m_payment_id,
      payment_status: pfData.payment_status,
      pf_payment_id: pfData.pf_payment_id,
      signature: pfData.signature,
    };

    let isSubscribed = false;

    if (pfData.token) {
      newPayment.token = pfData.token;
      isSubscribed = true;
    }

    if (pfData.billing_date) {
      newPayment.billing_date = new Date(pfData.billing_date);
    }

    const payment = new paymentSchema(newPayment);
    await payment.save();

    const user = await userSchema.findOne({ emailAddress: pfData.email_address }).exec();

    const invoices = await invoiceSchema
      .find<invoiceDTO>({
        invoiceStatus: "Due",
        "unit.users": user?._id.toString(),
      })
      .select({})
      .exec();

    const filteredInvoice = invoices.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.dueDate.getTime() - new Date().getTime());
      const currDiff = Math.abs(curr.dueDate.getTime() - new Date().getTime());

      // Return the current object if its difference is smaller than the previous smallest
      return currDiff < prevDiff ? curr : prev;
    });

    const invoice = await invoiceSchema
      .findByIdAndUpdate(
        filteredInvoice._id,
        {
          $set: {
            invoiceStatus: "Paid",
          },
        },
        {
          returnDocument: "after",
        },
      )
      .exec();

    const unit = await unitSchema.findOne<unitDTO>({ users: user?._id.toString() }).exec();
    const users = await userSchema.find({}).select({}).exec();

    if (unit) {
      for (const usr of users) {
        if ((unit.users as string[]).includes(usr._id.toString()))
          await userSchema.findByIdAndUpdate(usr._id, { $set: { visitorsTokens: 2147483647 } }).exec();
      }
    }

    const complex = await complexSchema.findById<complexDTO>(unit?.complex?._id).exec();

    const date = new Date();
    date.setMonth(invoice ? invoice.dueDate.getMonth() + 1 : date.getMonth() + 1);

    const _invoice: invoiceDTO = {
      amount: complex?.price as unknown as number,
      dueDate: date,
      invoiceStatus: "Due",
      isSubscribed: isSubscribed,
      issueDate: new Date(),
      unit: unit as unknown as unitDTO,
    };

    const newInvoice = new invoiceSchema(_invoice);
    await newInvoice.save();

    return res.status(200);
  } else {
    // Some checks have failed, check payment manually and log for investigation
    console.log("Failed Checks");
  }
});

paymentRouter.get("/cancel", AuthMiddleware, async (req: Request, res: Response) => {
  const email = res.get("email") as unknown;

  try {
    const today = new Date();

    const recentPayment = await paymentSchema
      .findOne<paymentsSchemaDto>({
        date: { $lte: today },
        email_address: email as string,
        token: { $ne: null },
      })
      .sort({ dateField: -1 }) // 3. Sort descending (closest to top)
      .exec();

    if (!recentPayment) return res.status(400).json({ message: "You are not subscribed!" });

    const cancellationPayload = {
      merchant_id: MERCHANT_ID,
      signature: recentPayment.signature,
      timestamp: today,
      token: recentPayment.token,
      version: "v1",
    };

    const request = await fetch(`${PAYFAST_API as unknown as string}/subscriptions/${recentPayment.token as unknown as string}/cancel`, {
      body: JSON.stringify(cancellationPayload),
      method: "PUT",
    });

    const response = (await request.json()) as cancelReturnDTO;

    if (response.status === "success") return res.status(200).json({ message: "Subscription cancelled successfully" });

    return res.status(400).json({ message: "Subscription failed to cancel. Contact equasec for assistance." });
  } catch (error: unknown) {
    res.status(500).json({ message: `Internal Server Error ${error as string}` });
  }
});

paymentRouter.get("/card", AuthMiddleware, async (req: Request, res: Response) => {
  const email = res.get("email") as unknown;

  try {
    const today = new Date();

    const recentPayment = await paymentSchema
      .findOne<paymentsSchemaDto>({
        date: { $lte: today },
        email_address: email as string,
        token: { $ne: null },
      })
      .sort({ dateField: -1 }) // 3. Sort descending (closest to top)
      .exec();

    if (!recentPayment) return res.status(400).json({ message: "You are not subscribed!" });

    return res.status(200).json({ message: "Subscription retrieved", payload: recentPayment.token });
  } catch (error: unknown) {
    res.status(500).json({ message: `Internal Server Error ${error as string}` });
  }
});

export default paymentRouter;
