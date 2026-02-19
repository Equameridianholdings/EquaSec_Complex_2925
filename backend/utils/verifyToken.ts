import jsonwebtoken from "jsonwebtoken";

export interface UserPayload {
    id: string;
    role: string
}

export default function VerifyToken(token: string) {
    try {
        const { verify } = jsonwebtoken
        const SECRET_KEY = process.env.SECRET_KEY as unknown as string;
        const decoded = verify(token, SECRET_KEY, { algorithms: ['HS512'] }) as UserPayload;
        return decoded;
    } catch {
        return null;
    }
};