import { NextFunction, Request, Response } from "express";

const payFastMiddleware = (req: Request, res: Response, next: NextFunction) => {
    res.sendStatus(200);
    next();
}

export default payFastMiddleware;