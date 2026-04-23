import { VehicleFormDTO } from './vehicleFormDTO';

export interface TenantFormDTO {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  idNumber: string;
  residenceType: 'complex' | 'community';
  complexId: string;
  communityId: string;
  communityResidenceType: 'house' | 'complex' | '';
  communityComplexId: string;
  address: string;
  vehicles: VehicleFormDTO[];
  password?: string; // For token-based registration
  confirmPassword?: string; // For token-based registration
}
