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
    let token;
    if (role.includes("security"))
      token = sign(claims, SECRET_KEY, { algorithm: "HS512", expiresIn: "12h" });
    else
      token = sign(claims, SECRET_KEY, { algorithm: "HS512", expiresIn: "30m" });

    return token;
  } catch (error) {
    throw new Error(error as string);
  }
}
