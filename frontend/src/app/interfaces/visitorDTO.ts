import { UserDTO } from './userDTO.js';
import { vehicleDTO } from './vehicleDTO.js';

export interface visitorDTO {
  _id?: string;
  access: boolean;
  code?: number;
  contact: string;
  driving: boolean;
  expiry?: Date;
  name: string;
  surname: string;
  user?: UserDTO;
  validity: boolean;
  vehicle?: vehicleDTO;
}

export const shareCode = (visitor: visitorDTO) => {
  const message = encodeURIComponent(
    `Your visitor access code is: ${visitor.code}\n\nVisitor: ${visitor.name}\nExpires: ${getHours(visitor)}\n\nPlease share this with your visitor.`,
  );
  const whatsappURL = `https://wa.me/?text=${message}`;
  window.open(whatsappURL, '_blank');
};

export const getHours = (visitor: visitorDTO): number => {
  let current = new Date();
  let expiry = new Date(Date.parse(visitor.expiry as unknown as string));

  if (current.getDay() === expiry.getDay()) return Math.abs(current.getHours() - expiry.getHours());

  return Math.abs(24 + current.getHours() - expiry.getHours());
};
