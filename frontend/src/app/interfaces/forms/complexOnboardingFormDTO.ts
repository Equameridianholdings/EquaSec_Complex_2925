export interface ComplexOnboardingFormDTO {
  address: string;
  complexName: string;
  hasBlocks: boolean;
  blocks: Array<{ name: string; numberOfUnits: number | string; unitStart?: number | string; unitEnd?: number | string }>;
  numberOfUnits: number | string;
  unitStart?: number | string;
  unitEnd?: number | string;
  parkingMode: 'fixed' | 'per-unit';
  fixedParkingCount: number | string;
  parkingIsUnlimited: boolean;
  selectedGatedCommunityForOnboarding: string;
}
