import { NextFunction, Request, Response } from "express";

const RoleMiddleware = (roles: string[]) => {
  return function (req: Request, res: Response, next: NextFunction) {
    const userRoles = res.get("role") as unknown as string[];

    if (!userRoles.some((role) => roles.includes(role))) {
      res.status(403).json({ message: "Access Forbidden!" });
      return;
    }
    next();
  };
};

export default RoleMiddleware;
