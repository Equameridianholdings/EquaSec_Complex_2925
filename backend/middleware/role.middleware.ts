import { NextFunction, Response } from "express";

const RoleMiddleware = (requiredRole: string[]) => {
    return function (req: Request, res: Response, next: NextFunction) {
        if (!requiredRole.includes(req.headers.get('role') as unknown as string)) {
            res.status(403).json({ message: "Access Forbidden!"});
            return;
        }
        next();
    } 
}

export default RoleMiddleware;