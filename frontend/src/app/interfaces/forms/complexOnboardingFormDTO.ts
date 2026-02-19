export interface ComplexOnboardingFormDTO {
  complexName: string;
  unitStart: number | string;
  unitEnd: number | string;
  parkingMode: 'fixed' | 'per-unit';
  fixedParkingCount: number | string;
  parkingIsUnlimited: boolean;
  selectedGatedCommunityForOnboarding: string;
}
