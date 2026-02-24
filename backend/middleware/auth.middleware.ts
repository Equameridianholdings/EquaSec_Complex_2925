import VerifyToken from "#utils/verifyToken.js";
import { NextFunction, Request, Response } from "express";

const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({ message: "Access-Denied!"})
        return;
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
    if (!token) {
        res.status(401).json({ message: "Access-Denied!"})
        return;
    }
    
    try {
        const decoded = VerifyToken(token);
        
        if (decoded) {
            res.set('email', decoded.email);
            res.set('role', decoded.role);
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