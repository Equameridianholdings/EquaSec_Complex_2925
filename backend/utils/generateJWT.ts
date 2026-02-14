import { UserDTO } from "#interfaces/userDTO.js";
import * as jwt from 'jsonwebtoken'

interface JwtPayload {
    id: string;
    role: string;
}

export default function GenerateJWT(payload: UserDTO): string {
    const claims: JwtPayload = {
        id: payload._id as unknown as string,
        role: payload.type,
    }
    const SECRET_KEY = process.env.SERCRET_KEY as unknown as string;

    return jwt.sign(claims, SECRET_KEY, { algorithm: 'HS512', expiresIn: '24h' } as jwt.SignOptions);
}