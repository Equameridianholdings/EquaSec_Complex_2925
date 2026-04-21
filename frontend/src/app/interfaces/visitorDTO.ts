import { unitDTO } from './unitDTO.js';
import { vehicleDTO } from './vehicleDTO.js';

export interface visitorDTO {
  _id?: string;
  access: boolean;
  arrivedAt?: Date;
  bookedAt?: Date;
  code?: number;
  contact: string;
  destination: unitDTO;
  driving: boolean;
  expiry?: Date;
  name: string;
  surname: string;
  validity: boolean;
  vehicle?: vehicleDTO;
  idPhoto?: string;
  diskPhoto?: string;
}

export const getHours = (visitor: visitorDTO): number => {
  let current = new Date();
  let expiry = new Date(Date.parse(visitor.expiry as unknown as string));
  
  if (current.getDay() === expiry.getDay()) return expiry.getHours() - current.getHours();

  return 24 - current.getHours() + expiry.getHours();
};


const getVisitorInviteMessage = (visitor: visitorDTO): string => {
  const pin = String(visitor.code ?? '').trim() || 'N/A';
  const location =
    String(visitor.destination?.complex?.name ?? '').trim() ||
    String(visitor.destination?.gatedCommunity?.name ?? '').trim();

  if (location) {
    return `Dear Visitor, your access PIN is ${pin}. This PIN expires in ${getHours(visitor)} hours. Complex: ${location}. Thank you.`;
  }

  return `Dear Visitor, your access PIN is ${pin}. This PIN expires in ${getHours(visitor)} hours. Thank you.`;
};

export const shareCode = (visitor: visitorDTO) => {
  const message = encodeURIComponent(getVisitorInviteMessage(visitor));
  const whatsappURL = `https://wa.me/?text=${message}`;
  window.open(whatsappURL, '_blank');
};