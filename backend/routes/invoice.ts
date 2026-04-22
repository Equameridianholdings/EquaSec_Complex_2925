import complexSchema from "#db/complexSchema.js";
import invoiceSchema from "#db/invoiceSchema.js";
import unitSchema from "#db/unitSchema.js";
import userSchema from "#db/userSchema.js";
import { complexDTO } from "#interfaces/complexDTO.js";
import { invoiceDTO } from "#interfaces/invoiceDTO.js";
import { unitDTO } from "#interfaces/unitDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { Request, Response, Router } from "express";

const invoiceRouter = Router();

invoiceRouter.use(AuthMiddleware);

invoiceRouter.get("/subscribed", async (req: Request, res: Response) => {
  const email = res.get("email");
  try {
    const user = await userSchema.findOne({ emailAddress: email }).exec();

    if (user && user.visitorsTokens as number <= 5 && user.visitorsTokens as number !== 0) return res.status(400).json({ message: "Trial is still active!"});

    const invoiceQuery = {
      dueDate: {
        $gte: new Date(),
      },
      invoiceStatus: "Due",
      "unit.users": user?.id.toString(),
    };
    const invoices = await invoiceSchema.find<invoiceDTO>(invoiceQuery).exec();

    if (invoices.length === 0) {
      const unit = await unitSchema.findOne<unitDTO>({ users: user?._id.toString() }).exec();
      
      if (!unit) return res.status(400).json({ message: "Error! You are not a part of a complex or gated community yet!"});

      const complex = await complexSchema.findById<complexDTO>(unit.complex?._id).exec();
      
      if (!complex) return res.status(400).json({ message: "Error! You are not a part of a complex yet!"});

      const _invoice: invoiceDTO = {
        amount: complex.price,
        dueDate: new Date(),
        invoiceStatus: "Due",
        isSubscribed: false,
        issueDate: new Date(),
        unit: unit as unknown as unitDTO,
      };

      const newInvoice = new invoiceSchema(_invoice);
      await newInvoice.save();

      return res.status(200).json({ message: "Invoice found!", payload: _invoice });
    }

    const invoice = invoices.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.dueDate.getTime() - new Date().getTime());
      const currDiff = Math.abs(curr.dueDate.getTime() - new Date().getTime());

      // Return the current object if its difference is smaller than the previous smallest
      return currDiff < prevDiff ? curr : prev;
    });

    return res.status(200).json({ message: "Invoice found!", payload: invoice });
  } catch (error: unknown) {
    // console.log(error);
    res.status(500).json({ message: `Internal Server Erorr ${error as string}` });
  }
});

export default invoiceRouter;
