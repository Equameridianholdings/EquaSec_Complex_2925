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

const getVisitorInviteMessage = (visitor: visitorDTO): string => {
  const pin = String(visitor.code ?? '').trim() || 'N/A';

  return `Dear Visitor, your access PIN is ${pin}. This PIN expires in 24 hours. Thank you. Estate Management.`;
};

export const shareCode = (visitor: visitorDTO) => {
  const message = encodeURIComponent(getVisitorInviteMessage(visitor));
  const whatsappURL = `https://wa.me/?text=${message}`;
  window.open(whatsappURL, '_blank');
};

export const getHours = (visitor: visitorDTO): number => {
  let current = new Date();
  let expiry = new Date(Date.parse(visitor.expiry as unknown as string));

  if (current.getDay() === expiry.getDay()) return Math.abs(current.getHours() - expiry.getHours());

  return Math.abs(24 + current.getHours() - expiry.getHours());
};
