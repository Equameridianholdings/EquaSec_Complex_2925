import * as crypto from "crypto";
import { Error } from "mongoose";

const ENCRYPTED_PREFIX = "ENC:";

export const encrypt = (text: string): string[] => {
  const SECRET_KEY = process.env.ENCRYPT_SECRET_KEY;

  if (!SECRET_KEY) throw new Error("No secret key provided.");

  const encoding: BufferEncoding = "base64";
  const key = Buffer.from(SECRET_KEY, encoding);

  try {
    const iv = crypto.randomBytes(12).toString(encoding);

    const cipher = crypto.createCipheriv("aes-256-gcm", key, Buffer.from(iv, encoding));
    let cipherText = cipher.update(text, "utf8", encoding);
    cipherText += cipher.final(encoding);
    const tag = cipher.getAuthTag();

    //Stores an array of objects ID[0] = CipherText, ID[1] = iv, ID[2] = tag
    return [ cipherText, iv, tag.toString(encoding) ];
  } catch (error) {
    throw new Error(error as string);
  }
};

export const decrypt = (cipherArr: string[]) => {
  const SECRET_KEY = process.env.ENCRYPT_SECRET_KEY;

  if (!SECRET_KEY) throw new Error("No secret key provided.");

  const encoding: BufferEncoding = 'base64';
  const key = Buffer.from(SECRET_KEY, encoding);

  try {
    const iv = Buffer.from(cipherArr[1], encoding);
    const encryptedText = Buffer.from(cipherArr[0], encoding);
    const tag = Buffer.from(cipherArr[2], encoding);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    let decryptedData = decipher.update(encryptedText).toString('utf8');
    decryptedData += decipher.final(encoding);

    return decryptedData;
  } catch (error) {
    throw new Error(error as string);
  }
};

/**
 * Encrypts a photo (base64 data URI) for at-rest storage.
 * Returns a prefixed JSON-serialised string that can be stored as a plain string field.
 */
export const encryptPhoto = (photoData: string): string => {
  if (!process.env.ENCRYPT_SECRET_KEY) {
    console.warn("[encryptPhoto] ENCRYPT_SECRET_KEY not set — storing photo unencrypted.");
    return photoData;
  }
  const parts = encrypt(photoData);
  return ENCRYPTED_PREFIX + JSON.stringify(parts);
};

/**
 * Decrypts a stored photo string produced by encryptPhoto.
 * Returns the original base64 data URI.
 * If the value is not encrypted (e.g. legacy record), it is returned as-is.
 */
export const decryptPhoto = (stored: string): string => {
  if (!stored.startsWith(ENCRYPTED_PREFIX)) return stored;
  try {
    const parts = JSON.parse(stored.slice(ENCRYPTED_PREFIX.length)) as string[];
    return decrypt(parts);
  } catch {
    return stored;
  }
};
