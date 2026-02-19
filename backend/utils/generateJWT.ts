import jsonwebtoken from "jsonwebtoken";

interface JwtPayload {
  email: string;
  role: string[];
}

export default function GenerateJWT(email: string, role: string[]): string {
  const { sign } = jsonwebtoken;
  const claims: JwtPayload = {
    email: email,
    role: role,
  };

  const SECRET_KEY = process.env.SECRET_KEY as unknown as string;

  try {
    const token = sign(claims, SECRET_KEY, { algorithm: "HS512", expiresIn: "24h" });

    return token;
  } catch (error) {
    throw new Error(error as string);
  }
}
