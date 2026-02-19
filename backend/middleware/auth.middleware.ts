import VerifyToken from "#utils/verifyToken.js";
import { NextFunction, Request, Response } from "express";

const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;

    if (!token) {
        res.status(401).json({ message: "Access-Denied!"})
        return;
    }
    
    try {
        const decoded = VerifyToken(token);
        
        if (decoded) {
            res.set("role", decoded.role);
            res.set("id", decoded.id);
        } else {
            res.status(400).json({ message: "Invalid Token!"});
            return;
        }

        next();
    } catch {
        res.status(400).json({ message: "Invalid Token!"});
        return;
    }
}

export default AuthMiddleware;