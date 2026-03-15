export interface complexDTO {
    _id?: string;
    address: string;
    blocks?: { name: string; numberOfUnits: number }[];
    fixedParkingCount?: null | number;
    gatedCommunityName?: string;
    name: string;
    numberOfUnits: number;
    parkingIsUnlimited: boolean;
    parkingMode: 'fixed' | 'per-unit';
    price: number;
    unitParkingConfig?: { parkingBays: number; unitNumber: number; }[];
}