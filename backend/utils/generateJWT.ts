import * as jwt from 'jsonwebtoken'

interface JwtPayload {
    id?: string;
    role: string[];
}

export default function GenerateJWT(id: string, role: string[]): string {
    const claims: JwtPayload = {
        id: id,
        role: role,
    }

    const SECRET_KEY = process.env.SECRET_KEY as unknown as string;
    
    return jwt.sign(claims, SECRET_KEY, { algorithm: 'HS512', expiresIn: '24h' } as jwt.SignOptions);
}