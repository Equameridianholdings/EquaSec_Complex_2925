import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-guard-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guard-portal.html',
  styleUrl: './guard-portal.css',
})
export class GuardPortal implements OnDestroy {
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('profileCameraVideo') private readonly profileCameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('profileCameraCanvas') private readonly profileCameraCanvas?: ElementRef<HTMLCanvasElement>;

  protected searchCode = '';
  protected searchUnit = '';
  protected searchReg = '';
  protected searchComplex = '';
  protected searchGatedCommunity = '';
  protected selectedComplex = '';
  protected selectedGatedCommunity = '';
  protected showUnitOptions = false;
  protected showRegOptions = false;
  protected showComplexOptions = false;
  protected showGatedCommunityOptions = false;
  protected showCodes = true;
  protected showResidents = true;
  protected showVehicles = true;
  protected toastVisible = false;
  protected toastMessage = '';
  private toastTimeoutId: number | null = null;
  protected isHoldingSos = false;
  protected showSosSuccess = false;
  protected isPhotoCameraModalOpen = false;
  protected cameraError = '';
  protected hasCameraStream = false;
  protected guardPhotoData = '';

  private sosHoldTimer: number | null = null;
  private sosAutoCloseTimer: number | null = null;
  private profileCameraStream: MediaStream | null = null;
  protected guardName = 'James Mthembu';
  protected guardPhotoUrl = '';

  constructor(
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {}
  protected get guardInitials(): string {
    return (this.guardName || 'Guard').trim().slice(0, 2).toUpperCase();
  }

  protected get selectedComplexName(): string {
    const complex = this.complexes.find((c) => c.id === this.selectedComplex);
    return complex?.name || 'Select a complex';
  }

  protected get selectedGatedCommunityName(): string {
    const gc = this.gatedCommunities.find((g) => g.id === this.selectedGatedCommunity);
    return gc?.name || 'Select a gated community';
  }

  protected readonly gatedCommunities = [
    {
      id: 'gated-paradise',
      name: 'Paradise Estate',
      complexes: [
        { id: 'complex-skyline', name: 'Skyline Residences' },
        { id: 'complex-harbor', name: 'Harbor Heights' },
      ],
    },
    {
      id: 'gated-greenvalley',
      name: 'Green Valley Security Estate',
      complexes: [
        { id: 'complex-oakwood', name: 'Oakwood Manor' },
      ],
    },
    {
      id: 'gated-central',
      name: 'Central Park Security Estate',
      complexes: [
        { id: 'complex-central-residences', name: 'Central Residences' },
        { id: 'complex-central-heights', name: 'Central Heights' },
      ],
    },
  ];

  protected readonly standaloneComplexes = [
    { id: 'complex-1', name: 'Complex 2925 Fleurhof' },
    { id: 'complex-2', name: 'Sunset View Estate' },
    { id: 'complex-3', name: 'Green Park Apartments' },
  ];

  protected get complexes(): Array<{ id: string; name: string }> {
    if (this.selectedGatedCommunity) {
      const gc = this.gatedCommunities.find((g) => g.id === this.selectedGatedCommunity);
      return gc?.complexes ?? [];
    }
    return this.standaloneComplexes;
  }

  protected readonly residents = [
    {
      name: 'Lerato Nkosi',
      unit: '402',
      cellphone: '082 123 4567',
      email: 'lerato@example.com',
      photoDataUrl: '',
      complexId: 'complex-1',
      gatedCommunityId: '',
    },
    {
      name: 'Sipho Dlamini',
      unit: '118',
      cellphone: '071 445 2211',
      email: 'sipho@example.com',
      photoDataUrl: '',
      complexId: 'complex-1',
      gatedCommunityId: '',
    },
    {
      name: 'James Williams',
      unit: '201',
      cellphone: '083 555 8899',
      email: 'james@example.com',
      photoDataUrl: '',
      complexId: 'complex-skyline',
      gatedCommunityId: 'gated-paradise',
    },
    {
      name: 'Maya Singh',
      unit: 'House 3',
      cellphone: '084 777 3344',
      email: 'maya@example.com',
      photoDataUrl: '',
      complexId: '',
      gatedCommunityId: 'gated-greenvalley',
    },
  ];
  protected readonly vehicles = [
    {
      make: 'Toyota',
      model: 'Hilux',
      regNumber: 'GP 123 456',
      color: 'Silver',
      unit: '402',
      owner: 'Lerato Nkosi',
      complexId: 'complex-1',
      gatedCommunityId: '',
    },
    {
      make: 'VW',
      model: 'Polo',
      regNumber: 'GT 654 321',
      color: 'Blue',
      unit: '118',
      owner: 'Sipho Dlamini',
      complexId: 'complex-1',
      gatedCommunityId: '',
    },
    {
      make: 'BMW',
      model: 'X5',
      regNumber: 'NW 789 012',
      color: 'Black',
      unit: '201',
      owner: 'James Williams',
      complexId: 'complex-skyline',
      gatedCommunityId: 'gated-paradise',
    },
    {
      make: 'Mercedes',
      model: 'C-Class',
      regNumber: 'FS 111 222',
      color: 'White',
      unit: 'House 3',
      owner: 'Maya Singh',
      complexId: '',
      gatedCommunityId: 'gated-greenvalley',
    },
  ];
  protected readonly activeCodes = [
    {
      code: '131249',
      visitorName: 'Thabo Moloi',
      tenantName: 'Lerato Nkosi',
      cellphone: '082 123 4567',
      unit: '402',
      expires: 'In 8 hours',
      isDriving: true,
      complexId: 'complex-1',
      gatedCommunityId: '',
      vehicle: {
        makeModel: 'Toyota Hilux',
        registration: 'GP 123 456',
        color: 'Silver'
      }
    },
    {
      code: '882190',
      visitorName: 'Ayanda Mokoena',
      tenantName: 'Sipho Dlamini',
      cellphone: '071 445 2211',
      unit: '118',
      expires: 'In 5 hours',
      isDriving: false,
      complexId: 'complex-1',
      gatedCommunityId: '',
    },
    {
      code: '445321',
      visitorName: 'Rebecca Johnson',
      tenantName: 'James Williams',
      cellphone: '083 555 8899',
      unit: '201',
      expires: 'In 3 hours',
      isDriving: true,
      complexId: 'complex-skyline',
      gatedCommunityId: 'gated-paradise',
      vehicle: {
        makeModel: 'BMW X5',
        registration: 'NW 789 012',
        color: 'Black'
      }
    },
    {
      code: '556789',
      visitorName: 'David Patel',
      tenantName: 'Maya Singh',
      cellphone: '084 777 3344',
      unit: 'House 3',
      expires: 'In 6 hours',
      isDriving: true,
      complexId: '',
      gatedCommunityId: 'gated-greenvalley',
      vehicle: {
        makeModel: 'Mercedes C-Class',
        registration: 'FS 111 222',
        color: 'White'
      }
    }
  ];

  protected get filteredCodes() {
    const codeQuery = this.searchCode.replace(/\D/g, '');
    const unitQuery = this.searchUnit.trim().toLowerCase();
    const regQuery = this.searchReg.trim().toLowerCase();
    let codes = this.activeCodes;
    
    // Filter by selected complex or gated community
    if (this.selectedComplex) {
      codes = codes.filter((code) => code.complexId === this.selectedComplex);
    } else if (this.selectedGatedCommunity) {
      codes = codes.filter((code) => code.gatedCommunityId === this.selectedGatedCommunity);
    }
    
    if (!codeQuery && !unitQuery && !regQuery) {
      return codes;
    }
    return codes.filter((code) => {
      const matchesCode = !codeQuery || code.code.includes(codeQuery);
      const matchesUnit = !unitQuery || code.unit.toLowerCase().includes(unitQuery);
      const registration = code.vehicle?.registration?.toLowerCase() ?? '';
      const matchesReg = !regQuery || registration.includes(regQuery);
      return matchesCode && matchesUnit && matchesReg;
    });
  }

  protected updateComplexSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.searchComplex = input.value;
    this.showComplexOptions = true;
  }

  protected updateGatedCommunitySearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.searchGatedCommunity = input.value;
    this.showGatedCommunityOptions = true;
  }

  protected updateUnitSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.searchUnit = input.value;
    this.showUnitOptions = true;
  }

  protected updateRegSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.searchReg = input.value;
    this.showRegOptions = true;
  }

  protected selectComplex(complexId: string): void {
    this.selectedComplex = complexId;
    this.selectedGatedCommunity = '';
    this.searchComplex = this.complexes.find((c) => c.id === complexId)?.name || '';
    this.showComplexOptions = false;
    // Reset other searches when complex changes
    this.searchUnit = '';
    this.searchCode = '';
    this.searchReg = '';
  }

  protected selectGatedCommunity(gatedCommunityId: string): void {
    this.selectedGatedCommunity = gatedCommunityId;
    this.selectedComplex = '';
    this.searchGatedCommunity = this.gatedCommunities.find((g) => g.id === gatedCommunityId)?.name || '';
    this.searchComplex = '';
    this.showGatedCommunityOptions = false;
    // Reset other searches when gated community changes
    this.searchUnit = '';
    this.searchCode = '';
    this.searchReg = '';
  }

  protected clearGatedCommunity(): void {
    this.selectedGatedCommunity = '';
    this.searchGatedCommunity = '';
    this.selectedComplex = '';
    this.searchComplex = '';
    this.showGatedCommunityOptions = false;
    // Reset other searches
    this.searchUnit = '';
    this.searchCode = '';
    this.searchReg = '';
  }

  protected setUnitDropdown(visible: boolean): void {
    this.showUnitOptions = visible;
  }

  protected setRegDropdown(visible: boolean): void {
    this.showRegOptions = visible;
  }

  protected setComplexDropdown(visible: boolean): void {
    this.showComplexOptions = visible;
  }

  protected setGatedCommunityDropdown(visible: boolean): void {
    this.showGatedCommunityOptions = visible;
  }

  protected get filteredComplexOptions(): string[] {
    const list = this.complexes.map((c) => c.name);
    const query = this.searchComplex.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((name) => name.toLowerCase().includes(query));
  }

  protected get filteredGatedCommunityOptions(): string[] {
    const list = this.gatedCommunities.map((g) => g.name);
    const query = this.searchGatedCommunity.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((name) => name.toLowerCase().includes(query));
  }

  protected clearOtherSearches(activeField: 'unit' | 'reg' | 'code'): void {
    if (activeField === 'unit') {
      this.searchCode = '';
      this.searchReg = '';
      this.showRegOptions = false;
      this.showCodes = false;
      this.showResidents = true;
      this.showVehicles = false;
    } else if (activeField === 'reg') {
      this.searchCode = '';
      this.searchUnit = '';
      this.showUnitOptions = false;
      this.showCodes = true;
      this.showResidents = false;
      this.showVehicles = true;
    } else if (activeField === 'code') {
      this.searchUnit = '';
      this.searchReg = '';
      this.showUnitOptions = false;
      this.showRegOptions = false;
      this.showCodes = true;
      this.showResidents = false;
      this.showVehicles = false;
    }
  }

  protected selectUnit(unit: string): void {
    this.searchUnit = unit;
    this.showUnitOptions = false;
  }

  protected selectReg(reg: string): void {
    this.searchReg = reg;
    this.showRegOptions = false;
  }

  protected get filteredUnitOptions(): string[] {
    let residents = this.residents;
    let vehicles = this.vehicles;
    
    // Filter by complex or gated community
    if (this.selectedComplex) {
      residents = residents.filter((r) => r.complexId === this.selectedComplex);
      vehicles = vehicles.filter((v) => v.complexId === this.selectedComplex);
    } else if (this.selectedGatedCommunity) {
      residents = residents.filter((r) => r.gatedCommunityId === this.selectedGatedCommunity);
      vehicles = vehicles.filter((v) => v.gatedCommunityId === this.selectedGatedCommunity);
    }
    
    const units = new Set<string>([
      ...residents.map((resident) => resident.unit),
      ...vehicles.map((vehicle) => vehicle.unit),
    ]);
    const list = Array.from(units).sort();
    const query = this.searchUnit.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((unit) => unit.toLowerCase().includes(query));
  }

  protected get filteredRegOptions(): string[] {
    let vehicles = this.vehicles;
    let codes = this.activeCodes;
    
    // Filter by complex or gated community
    if (this.selectedComplex) {
      vehicles = vehicles.filter((v) => v.complexId === this.selectedComplex);
      codes = codes.filter((c) => c.complexId === this.selectedComplex);
    } else if (this.selectedGatedCommunity) {
      vehicles = vehicles.filter((v) => v.gatedCommunityId === this.selectedGatedCommunity);
      codes = codes.filter((c) => c.gatedCommunityId === this.selectedGatedCommunity);
    }
    
    const allVehicles = [
      ...vehicles,
      ...codes
        .filter((code) => code.isDriving && code.vehicle)
        .map((code) => ({
          regNumber: code.vehicle?.registration ?? '',
          make: code.vehicle?.makeModel?.split(' ')[0] ?? '',
          model: code.vehicle?.makeModel?.split(' ')[1] ?? '',
          color: code.vehicle?.color ?? '',
          unit: code.unit,
          owner: code.visitorName,
          complexId: code.complexId,
          gatedCommunityId: code.gatedCommunityId,
        })),
    ];
    const list = allVehicles.map((vehicle) => vehicle.regNumber).sort();
    const query = this.searchReg.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((reg) => reg.toLowerCase().includes(query));
  }

  protected get filteredResidents() {
    let residents = this.residents;
    
    // Filter by complex or gated community
    if (this.selectedComplex) {
      residents = residents.filter((r) => r.complexId === this.selectedComplex);
    } else if (this.selectedGatedCommunity) {
      residents = residents.filter((r) => r.gatedCommunityId === this.selectedGatedCommunity);
    }
    
    const unitQuery = this.searchUnit.trim().toLowerCase();
    if (!unitQuery) {
      return residents;
    }
    return residents.filter((resident) => resident.unit.toLowerCase().includes(unitQuery));
  }

  protected get filteredVisitorsForUnit() {
    let codes = this.activeCodes;
    
    // Filter by complex or gated community
    if (this.selectedComplex) {
      codes = codes.filter((c) => c.complexId === this.selectedComplex);
    } else if (this.selectedGatedCommunity) {
      codes = codes.filter((c) => c.gatedCommunityId === this.selectedGatedCommunity);
    }
    
    const unitQuery = this.searchUnit.trim().toLowerCase();
    if (!unitQuery) {
      return [];
    }
    return codes.filter((code) => code.unit.toLowerCase().includes(unitQuery));
  }

  protected get filteredVehicles() {
    let vehicles = this.vehicles;
    let codes = this.activeCodes;
    
    // Filter by complex or gated community
    if (this.selectedComplex) {
      vehicles = vehicles.filter((v) => v.complexId === this.selectedComplex);
      codes = codes.filter((c) => c.complexId === this.selectedComplex);
    } else if (this.selectedGatedCommunity) {
      vehicles = vehicles.filter((v) => v.gatedCommunityId === this.selectedGatedCommunity);
      codes = codes.filter((c) => c.gatedCommunityId === this.selectedGatedCommunity);
    }
    
    const regQuery = this.searchReg.trim().toLowerCase();
    const allVehicles = [
      ...vehicles,
      ...codes
        .filter((code) => code.isDriving && code.vehicle)
        .map((code) => ({
          regNumber: code.vehicle?.registration ?? '',
          make: code.vehicle?.makeModel?.split(' ')[0] ?? '',
          model: code.vehicle?.makeModel?.split(' ')[1] ?? '',
          color: code.vehicle?.color ?? '',
          unit: code.unit,
          owner: code.visitorName,
          complexId: code.complexId,
          gatedCommunityId: code.gatedCommunityId,
        })),
    ];
    if (!regQuery) {
      return allVehicles;
    }
    return allVehicles.filter((vehicle) =>
      vehicle.regNumber.toLowerCase().includes(regQuery)
    );
  }

  protected getResidentInitials(name: string): string {
    return (name || 'Resident').trim().slice(0, 2).toUpperCase();
  }

  protected onGrantAccess(): void {
    this.showToast('Access granted');
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    this.toastVisible = true;
    if (this.toastTimeoutId !== null) {
      window.clearTimeout(this.toastTimeoutId);
    }
    this.toastTimeoutId = window.setTimeout(() => {
      this.toastVisible = false;
      this.toastTimeoutId = null;
      window.location.reload();
    }, 4000);
  }

  protected startSosHold(event: Event): void {
    event.preventDefault();
    if (this.isHoldingSos || this.showSosSuccess) {
      return;
    }

    this.isHoldingSos = true;
    this.clearSosHoldTimer();
    this.sosHoldTimer = window.setTimeout(() => {
      this.zone.run(() => {
        this.triggerSosSuccess();
      });
    }, 5000);
  }

  protected endSosHold(): void {
    if (!this.isHoldingSos) {
      return;
    }
    this.isHoldingSos = false;
    this.clearSosHoldTimer();
  }

  private triggerSosSuccess(): void {
    this.isHoldingSos = false;
    this.clearSosHoldTimer();
    this.showSosSuccess = true;
    this.clearSosAutoCloseTimer();
    this.sosAutoCloseTimer = window.setTimeout(() => {
      window.location.reload();
    }, 5000);
  }

  private clearSosHoldTimer(): void {
    if (this.sosHoldTimer !== null) {
      window.clearTimeout(this.sosHoldTimer);
      this.sosHoldTimer = null;
    }
  }

  private clearSosAutoCloseTimer(): void {
    if (this.sosAutoCloseTimer !== null) {
      window.clearTimeout(this.sosAutoCloseTimer);
      this.sosAutoCloseTimer = null;
    }
  }

  protected triggerCameraInput(): void {
    this.isPhotoCameraModalOpen = true;
    setTimeout(() => {
      void this.startProfileCamera();
    }, 100);
  }

  protected onPhotoCapture(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.guardPhotoData = e.target?.result as string;
        console.log('Photo captured:', this.guardPhotoData);
      };
      reader.readAsDataURL(file);
    }
  }

  protected async startProfileCamera(): Promise<void> {
    this.cameraError = '';
    this.guardPhotoData = '';

    try {
      this.profileCameraStream?.getTracks().forEach((track) => track.stop());
      this.profileCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      const video = this.profileCameraVideo?.nativeElement;
      if (video) {
        video.srcObject = this.profileCameraStream;
        await video.play();
      }
      this.hasCameraStream = true;
    } catch (error) {
      this.cameraError = 'Unable to access the camera. Please allow camera permissions.';
      this.profileCameraStream?.getTracks().forEach((track) => track.stop());
      this.profileCameraStream = null;
      this.hasCameraStream = false;
    }
  }

  protected captureProfilePhoto(): void {
    const video = this.profileCameraVideo?.nativeElement;
    const canvas = this.profileCameraCanvas?.nativeElement;
    if (!video || !canvas) {
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    this.guardPhotoData = canvas.toDataURL('image/jpeg', 0.9);
    this.stopProfileCamera();
  }

  protected retakeProfilePhoto(): void {
    void this.startProfileCamera();
  }

  protected closeProfilePhotoModal(): void {
    this.stopProfileCamera();
    this.isPhotoCameraModalOpen = false;
  }

  protected stopProfileCamera(): void {
    this.profileCameraStream?.getTracks().forEach((track) => track.stop());
    this.profileCameraStream = null;
    this.hasCameraStream = false;
    const video = this.profileCameraVideo?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  ngOnDestroy(): void {
    this.clearSosHoldTimer();
    this.clearSosAutoCloseTimer();
    this.stopProfileCamera();
  }
}
