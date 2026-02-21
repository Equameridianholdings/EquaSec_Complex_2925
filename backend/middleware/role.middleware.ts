import { NextFunction, Request, Response } from "express";

const RoleMiddleware = (requiredRole: string[]) => {
    return function (req: Request, res: Response, next: NextFunction) {
        const authReq = req as Request & { userRoles?: string[] };
        const userRoles = authReq.userRoles ?? [];

        if (!requiredRole.some((role) => userRoles.includes(role))) {
            res.status(403).json({ message: "Access Forbidden!"});
            return;
        }
        next();
    } 
}

export default RoleMiddleware;