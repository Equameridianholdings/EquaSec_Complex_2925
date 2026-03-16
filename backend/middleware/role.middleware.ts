import { NextFunction, Request, Response } from "express";

const RoleMiddleware = (roles: string[]) => {
  return function (req: Request, res: Response, next: NextFunction) {
    const userRoles = res.get("role") as unknown as string[];
    
    roles.forEach((role) => {
      if(userRoles.includes(role)) return;
    });
    next();
  };
};

export default RoleMiddleware;
