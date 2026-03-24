import { complexDTO } from './complexDTO.js';

export interface UserDTO {
  _id?: string;
  cellNumber: string;
  complexId?: string;
  complex?: complexDTO;
  confirmPassword: string;
  emailAddress: string;
  gatedCommunity?: { _id?: string; name?: string } | null;
  gatedCommunityId?: string;
  houseNumber?: string;
  idNumber?: string;
  movedOut: boolean;
  name: string;
  password: string;
  profilePhoto: string;
  salt?: string;
  surname: string;
  type: string[];
  unit?: string;
  visitorsTokens: number;
}

export interface loginDTO {
  emailAddress: string;
  password: string;
}
