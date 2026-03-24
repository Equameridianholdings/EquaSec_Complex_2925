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
    const invoiceQuery = {
      dueDate: {
        $gte: new Date(),
      },
      invoiceStatus: "Due",
      "unit.users": user?.id.toString(),
    };
    const invoices = await invoiceSchema.find<invoiceDTO>(invoiceQuery).exec();

    if (invoices.length <= 0) {
      const unit = await unitSchema.findOne<unitDTO>({ users: user?._id.toString() }).exec();
      const complex = await complexSchema.findById<complexDTO>(unit?.complex?._id).exec();

      const _invoice: invoiceDTO = {
        amount: complex?.price as unknown as number,
        dueDate: new Date(),
        invoiceStatus: "Due",
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
