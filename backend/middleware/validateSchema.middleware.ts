import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator/lib/validation-result.js";

export function validateSchema(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Handle and print errors
        // console.log('Validation errors:', errors.array());

        return res.status(400).json({
            message: "Invalid request",
            payload: errors.array(), // Returns an array of ValidationError objects
        });
    }
    next();
}