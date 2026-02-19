import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { GuardPortalFiltersFormDTO } from '../interfaces/forms/guardPortalFiltersFormDTO';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-guard-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guard-portal.html',
  styleUrl: './guard-portal.css',
})
export class GuardPortal implements OnInit, OnDestroy {
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('profileCameraVideo') private readonly profileCameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('profileCameraCanvas') private readonly profileCameraCanvas?: ElementRef<HTMLCanvasElement>;

  protected filtersForm: GuardPortalFiltersFormDTO = {
    searchCode: '',
    searchUnit: '',
    searchReg: '',
    searchComplex: '',
    searchGatedCommunity: '',
    searchComplexFilter: '',
    selectedComplex: '',
    selectedGatedCommunity: ''
  };
  protected get searchCode(): string {
    return this.filtersForm.searchCode;
  }

  protected set searchCode(value: string) {
    this.filtersForm.searchCode = value;
  }

  protected get searchUnit(): string {
    return this.filtersForm.searchUnit;
  }

  protected set searchUnit(value: string) {
    this.filtersForm.searchUnit = value;
  }

  protected get searchReg(): string {
    return this.filtersForm.searchReg;
  }

  protected set searchReg(value: string) {
    this.filtersForm.searchReg = value;
  }

  protected get searchComplexFilter(): string {
    return this.filtersForm.searchComplexFilter;
  }

  protected set searchComplexFilter(value: string) {
    this.filtersForm.searchComplexFilter = value;
  }

  protected get selectedGatedCommunity(): string {
    return this.filtersForm.selectedGatedCommunity;
  }

  protected set selectedGatedCommunity(value: string) {
    this.filtersForm.selectedGatedCommunity = value;
  }

  protected get selectedComplex(): string {
    return this.filtersForm.selectedComplex;
  }

  protected set selectedComplex(value: string) {
    this.filtersForm.selectedComplex = value;
  }
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
  protected showStationPrompt = true;
  protected stationLocked = false;
  protected stationType: 'gated' | 'complex' | '' = '';

  private sosHoldTimer: number | null = null;
  private sosAutoCloseTimer: number | null = null;
  private profileCameraStream: MediaStream | null = null;
  protected guardName = 'James Mthembu';
  protected guardPhotoUrl = '';
  private readonly stationStorageKey = 'equasec.guard.station';
  protected shiftStartAt: Date | null = null;
  protected showEndShiftConfirm = false;
  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly dataService: DataService,
  ) {}
  protected get guardInitials(): string {
    return (this.guardName || 'Guard').trim().slice(0, 2).toUpperCase();
  }

  protected get selectedComplexName(): string {
    const complex = this.complexes.find((c) => c.id === this.filtersForm.selectedComplex);
    return complex?.name || 'Select a complex';
  }

  protected get selectedGatedCommunityName(): string {
    const gc = this.gatedCommunities.find((g) => g.id === this.filtersForm.selectedGatedCommunity);
    return gc?.name || 'Select a gated community';
  }

  protected get selectedStationName(): string {
    if (this.filtersForm.selectedComplex && this.filtersForm.selectedGatedCommunity) {
      return `${this.selectedComplexName} - ${this.selectedGatedCommunityName}`;
    }
    if (this.filtersForm.selectedComplex) {
      return this.selectedComplexName;
    }
    if (this.filtersForm.selectedGatedCommunity) {
      return this.selectedGatedCommunityName;
    }
    return 'Select station';
  }

  protected get stationSelectionReady(): boolean {
    if (this.stationType === 'gated') {
      return this.filtersForm.selectedGatedCommunity.length > 0;
    }
    if (this.stationType === 'complex') {
      return this.filtersForm.selectedComplex.length > 0;
    }
    return false;
  }

  protected get shiftStartLabel(): string {
    if (!this.shiftStartAt) {
      return 'Not started';
    }
    return this.shiftStartAt.toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected get unitSearchDisabled(): boolean {
    if (this.stationType !== 'gated') {
      return false;
    }
    const hasStationComplex = this.filtersForm.selectedComplex.length > 0;
    const hasSearchComplex = this.filtersForm.searchComplexFilter.length > 0;
    return !hasStationComplex && !hasSearchComplex;
  }

  ngOnInit(): void {
    this.loadGuardPortalData();
  }
  protected gatedCommunities: Array<{ id: string; name: string; complexes: Array<{ id: string; name: string }> }> = [];

  protected standaloneComplexes: Array<{ id: string; name: string }> = [];

  protected get complexes(): Array<{ id: string; name: string }> {
    if (this.filtersForm.selectedGatedCommunity) {
      const gc = this.gatedCommunities.find((g) => g.id === this.filtersForm.selectedGatedCommunity);
      return gc?.complexes ?? [];
    }
    return this.standaloneComplexes;
  }

  protected residents: Array<{
    name: string;
    unit: string;
    cellphone: string;
    email: string;
    photoDataUrl: string;
    complexId: string;
    gatedCommunityId: string;
  }> = [];
  protected vehicles: Array<{
    make: string;
    model: string;
    regNumber: string;
    color: string;
    unit: string;
    owner: string;
    complexId: string;
    gatedCommunityId: string;
  }> = [];
  protected activeCodes: Array<any> = [];

  private loadGuardPortalData(): void {
    this.dataService
      .get<any>('user/current')
      .pipe(
        switchMap((currentUser) => {
          if (currentUser) {
            this.guardName = `${currentUser.name ?? ''} ${currentUser.surname ?? ''}`.trim() || this.guardName;
            this.guardPhotoUrl = currentUser.profilePhoto ?? '';
          }
          const guardId = currentUser?._id as string | undefined;
          const visitors$ = guardId ? this.dataService.get<any[]>(`visitor/${guardId}`) : of([]);
          return forkJoin({
            gated: this.dataService.get<any[]>('gatedCommunity').pipe(catchError(() => of([]))),
            complexes: this.dataService.get<any[]>('complex').pipe(catchError(() => of([]))),
            users: this.dataService.get<any[]>('user').pipe(catchError(() => of([]))),
            vehicles: this.dataService.get<any[]>('vehicle').pipe(catchError(() => of([]))),
            visitors: visitors$.pipe(catchError(() => of([]))),
          });
        }),
        catchError(() =>
          forkJoin({
            gated: of([]),
            complexes: of([]),
            users: of([]),
            vehicles: of([]),
            visitors: of([]),
          })
        )
      )
      .subscribe(({ gated, complexes, users, vehicles, visitors }) => {
        this.gatedCommunities = (gated || []).map((community) => ({
          id: community._id ?? community.id ?? '',
          name: community.name ?? '',
          complexes: [],
        }));

        this.standaloneComplexes = (complexes || []).map((complex) => ({
          id: complex._id ?? complex.id ?? '',
          name: complex.name ?? '',
        }));

        this.residents = (users || []).map((user) => ({
          name: `${user.name ?? ''} ${user.surname ?? ''}`.trim(),
          unit: user.unit ?? '',
          cellphone: user.cellNumber ?? '',
          email: user.emailAddress ?? '',
          photoDataUrl: user.profilePhoto ?? '',
          complexId: user.complex?._id ?? '',
          gatedCommunityId: '',
        }));

        this.vehicles = (vehicles || []).map((vehicle) => ({
          make: vehicle.make ?? '',
          model: vehicle.model ?? '',
          regNumber: vehicle.registerationNumber ?? vehicle.regNumber ?? '',
          color: vehicle.color ?? '',
          unit: vehicle.unit ?? '',
          owner: `${vehicle.user?.name ?? ''} ${vehicle.user?.surname ?? ''}`.trim(),
          complexId: vehicle.user?.complex?._id ?? '',
          gatedCommunityId: '',
        }));

        this.activeCodes = (visitors || []).map((visitor) => ({
          code: String(visitor.code ?? ''),
          visitorName: `${visitor.name ?? ''} ${visitor.surname ?? ''}`.trim(),
          tenantName: `${visitor.user?.name ?? ''} ${visitor.user?.surname ?? ''}`.trim(),
          cellphone: visitor.contact ?? '',
          unit: visitor.user?.unit ?? '',
          expires: this.formatExpiryLabel(visitor.expiry),
          isDriving: Boolean(visitor.driving),
          complexId: visitor.user?.complex?._id ?? '',
          gatedCommunityId: '',
          vehicle: visitor.vehicle
            ? {
                makeModel: `${visitor.vehicle.make ?? ''} ${visitor.vehicle.model ?? ''}`.trim(),
                registration: visitor.vehicle.registerationNumber ?? visitor.vehicle.registration ?? '',
                color: visitor.vehicle.color ?? '',
              }
            : undefined,
        }));

        this.restoreStationSelection();
        this.cdr.markForCheck();
      });
  }

  private formatExpiryLabel(expiry: unknown): string {
    if (!expiry) {
      return '';
    }
    const expiryDate = new Date(expiry as string);
    if (Number.isNaN(expiryDate.getTime())) {
      return '';
    }
    const diffMs = expiryDate.getTime() - Date.now();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) {
      return 'Expired';
    }
    return `In ${diffHours} hours`;
  }

  protected get filteredCodes() {
    const codeQuery = this.filtersForm.searchCode.replace(/\D/g, '');
    const unitQuery = this.filtersForm.searchUnit.trim().toLowerCase();
    const regQuery = this.filtersForm.searchReg.trim().toLowerCase();
    let codes = this.activeCodes;
    
    // Filter by selected complex or gated community
    if (this.filtersForm.selectedComplex) {
      codes = codes.filter((code) => code.complexId === this.filtersForm.selectedComplex);
    } else if (this.filtersForm.selectedGatedCommunity) {
      codes = codes.filter((code) => code.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
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
    this.filtersForm.searchComplex = input.value;
    this.showComplexOptions = true;
  }

  protected updateGatedCommunitySearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.filtersForm.searchGatedCommunity = input.value;
    this.showGatedCommunityOptions = true;
  }

  protected updateUnitSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    if (this.unitSearchDisabled) {
      return;
    }
    this.filtersForm.searchUnit = input.value;
    this.showUnitOptions = true;
  }

  protected updateRegSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.filtersForm.searchReg = input.value;
    this.showRegOptions = true;
  }

  protected selectComplex(complexId: string): void {
    this.filtersForm.selectedComplex = complexId;
    this.filtersForm.selectedGatedCommunity = '';
    this.filtersForm.searchComplex = this.complexes.find((c) => c.id === complexId)?.name || '';
    this.showComplexOptions = false;
    // Reset other searches when complex changes
    this.filtersForm.searchUnit = '';
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
  }

  protected selectGatedCommunity(gatedCommunityId: string): void {
    this.filtersForm.selectedGatedCommunity = gatedCommunityId;
    this.filtersForm.selectedComplex = '';
    this.filtersForm.searchGatedCommunity = this.gatedCommunities.find((g) => g.id === gatedCommunityId)?.name || '';
    this.filtersForm.searchComplex = '';
    this.showGatedCommunityOptions = false;
    // Reset other searches when gated community changes
    this.filtersForm.searchUnit = '';
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
  }

  protected clearGatedCommunity(): void {
    this.filtersForm.selectedGatedCommunity = '';
    this.filtersForm.searchGatedCommunity = '';
    this.filtersForm.selectedComplex = '';
    this.filtersForm.searchComplex = '';
    this.showGatedCommunityOptions = false;
    // Reset other searches
    this.filtersForm.searchUnit = '';
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
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

  protected chooseStationType(type: 'gated' | 'complex'): void {
    this.stationType = type;
    if (type === 'gated') {
      this.filtersForm.selectedComplex = '';
      this.filtersForm.searchComplex = '';
    } else {
      this.filtersForm.selectedGatedCommunity = '';
      this.filtersForm.searchGatedCommunity = '';
      this.filtersForm.selectedComplex = '';
    }
  }

  protected onStationGatedChange(): void {
    this.filtersForm.selectedComplex = '';
  }

  protected confirmStationSelection(): void {
    if (!this.stationSelectionReady) {
      return;
    }

    if (this.stationType === 'gated') {
      this.filtersForm.searchGatedCommunity = this.selectedGatedCommunityName;
      if (this.filtersForm.selectedComplex) {
        this.filtersForm.searchComplex = this.selectedComplexName;
      } else {
        this.filtersForm.searchComplex = '';
      }
      this.filtersForm.searchComplexFilter = this.filtersForm.selectedComplex || '';
    } else if (this.stationType === 'complex') {
      this.filtersForm.searchComplex = this.selectedComplexName;
      this.filtersForm.selectedGatedCommunity = '';
      this.filtersForm.searchGatedCommunity = '';
      this.filtersForm.searchComplexFilter = '';
    }

    this.filtersForm.searchUnit = '';
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
    this.showStationPrompt = false;
    this.stationLocked = true;
    if (!this.shiftStartAt) {
      this.shiftStartAt = new Date();
    }
    this.persistStationSelection();
  }

  protected changeStation(): void {
    this.stationLocked = false;
    this.showStationPrompt = true;
    this.stationType = '';
    this.filtersForm.selectedGatedCommunity = '';
    this.filtersForm.searchGatedCommunity = '';
    this.filtersForm.selectedComplex = '';
    this.filtersForm.searchComplex = '';
    this.filtersForm.searchUnit = '';
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
    this.filtersForm.searchComplexFilter = '';
    this.clearStationSelection();
  }

  protected endShift(): void {
    this.showEndShiftConfirm = true;
  }

  protected cancelEndShift(): void {
    this.showEndShiftConfirm = false;
  }

  protected confirmEndShift(): void {
    this.showEndShiftConfirm = false;
    this.changeStation();
    void this.router.navigate(['/login']);
  }

  private persistStationSelection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const payload = {
      stationType: this.stationType,
      selectedGatedCommunity: this.filtersForm.selectedGatedCommunity,
      selectedComplex: this.filtersForm.selectedComplex,
      shiftStartedAt: this.shiftStartAt?.toISOString() ?? '',
    };
    window.localStorage.setItem(this.stationStorageKey, JSON.stringify(payload));
  }

  private restoreStationSelection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const raw = window.localStorage.getItem(this.stationStorageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        stationType?: 'gated' | 'complex' | '';
        selectedGatedCommunity?: string;
        selectedComplex?: string;
        shiftStartedAt?: string;
      };

      if (!parsed.stationType) {
        return;
      }

      this.stationType = parsed.stationType;
      this.filtersForm.selectedGatedCommunity = parsed.selectedGatedCommunity ?? '';
      this.filtersForm.selectedComplex = parsed.selectedComplex ?? '';
      this.shiftStartAt = parsed.shiftStartedAt ? new Date(parsed.shiftStartedAt) : new Date();

      if (this.stationType === 'gated') {
        this.filtersForm.searchGatedCommunity = this.selectedGatedCommunityName;
        this.filtersForm.searchComplex = this.filtersForm.selectedComplex ? this.selectedComplexName : '';
        this.filtersForm.searchComplexFilter = this.filtersForm.selectedComplex || '';
      } else if (this.stationType === 'complex') {
        this.filtersForm.searchComplex = this.selectedComplexName;
        this.filtersForm.searchGatedCommunity = '';
        this.filtersForm.selectedGatedCommunity = '';
        this.filtersForm.searchComplexFilter = '';
      }

      this.showStationPrompt = false;
      this.stationLocked = true;
    } catch {
      this.clearStationSelection();
    }
  }

  private clearStationSelection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.localStorage.removeItem(this.stationStorageKey);
  }

  protected get filteredComplexOptions(): string[] {
    const list = this.complexes.map((c) => c.name);
    const query = this.filtersForm.searchComplex.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((name) => name.toLowerCase().includes(query));
  }

  protected get filteredGatedCommunityOptions(): string[] {
    const list = this.gatedCommunities.map((g) => g.name);
    const query = this.filtersForm.searchGatedCommunity.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((name) => name.toLowerCase().includes(query));
  }

  protected clearOtherSearches(activeField: 'unit' | 'reg' | 'code'): void {
    if (activeField === 'unit') {
      this.filtersForm.searchCode = '';
      this.filtersForm.searchReg = '';
      this.showRegOptions = false;
      this.showCodes = false;
      this.showResidents = true;
      this.showVehicles = false;
    } else if (activeField === 'reg') {
      this.filtersForm.searchCode = '';
      this.filtersForm.searchUnit = '';
      this.showUnitOptions = false;
      this.showCodes = true;
      this.showResidents = false;
      this.showVehicles = true;
    } else if (activeField === 'code') {
      this.filtersForm.searchUnit = '';
      this.filtersForm.searchReg = '';
      this.showUnitOptions = false;
      this.showRegOptions = false;
      this.showCodes = true;
      this.showResidents = false;
      this.showVehicles = false;
    }
  }

  protected selectUnit(unit: string): void {
    this.filtersForm.searchUnit = unit;
    this.showUnitOptions = false;
  }

  protected onSearchComplexFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (!select) {
      return;
    }
    this.filtersForm.searchComplexFilter = select.value;
    this.filtersForm.searchUnit = '';
    this.showUnitOptions = false;
  }

  protected selectReg(reg: string): void {
    this.filtersForm.searchReg = reg;
    this.showRegOptions = false;
  }

  protected get filteredUnitOptions(): string[] {
    let residents = this.residents;
    let vehicles = this.vehicles;
    const complexFilter = this.filtersForm.searchComplexFilter || this.filtersForm.selectedComplex;

    // Filter by complex or gated community
    if (complexFilter) {
      residents = residents.filter((r) => r.complexId === complexFilter);
      vehicles = vehicles.filter((v) => v.complexId === complexFilter);
    } else if (this.filtersForm.selectedGatedCommunity) {
      residents = residents.filter((r) => r.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
      vehicles = vehicles.filter((v) => v.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
    }
    
    const units = new Set<string>([
      ...residents.map((resident) => resident.unit),
      ...vehicles.map((vehicle) => vehicle.unit),
    ]);
    const list = Array.from(units).sort();
    const query = this.filtersForm.searchUnit.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((unit) => unit.toLowerCase().includes(query));
  }

  protected get filteredRegOptions(): string[] {
    let vehicles = this.vehicles;
    let codes = this.activeCodes;
    
    // Filter by complex or gated community
    if (this.filtersForm.selectedComplex) {
      vehicles = vehicles.filter((v) => v.complexId === this.filtersForm.selectedComplex);
      codes = codes.filter((c) => c.complexId === this.filtersForm.selectedComplex);
    } else if (this.filtersForm.selectedGatedCommunity) {
      vehicles = vehicles.filter((v) => v.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
      codes = codes.filter((c) => c.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
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
    const query = this.filtersForm.searchReg.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((reg) => reg.toLowerCase().includes(query));
  }

  protected get filteredResidents() {
    let residents = this.residents;
    const complexFilter = this.filtersForm.searchComplexFilter || this.filtersForm.selectedComplex;

    // Filter by complex or gated community
    if (complexFilter) {
      residents = residents.filter((r) => r.complexId === complexFilter);
    } else if (this.filtersForm.selectedGatedCommunity) {
      residents = residents.filter((r) => r.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
    }
    
    const unitQuery = this.filtersForm.searchUnit.trim().toLowerCase();
    if (!unitQuery) {
      return residents;
    }
    return residents.filter((resident) => resident.unit.toLowerCase().includes(unitQuery));
  }

  protected get filteredVisitorsForUnit() {
    let codes = this.activeCodes;
    const complexFilter = this.filtersForm.searchComplexFilter || this.filtersForm.selectedComplex;

    // Filter by complex or gated community
    if (complexFilter) {
      codes = codes.filter((c) => c.complexId === complexFilter);
    } else if (this.filtersForm.selectedGatedCommunity) {
      codes = codes.filter((c) => c.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
    }
    
    const unitQuery = this.filtersForm.searchUnit.trim().toLowerCase();
    if (!unitQuery) {
      return [];
    }
    return codes.filter((code) => code.unit.toLowerCase().includes(unitQuery));
  }

  protected get filteredVehicles() {
    let vehicles = this.vehicles;
    let codes = this.activeCodes;
    const complexFilter = this.filtersForm.searchComplexFilter || this.filtersForm.selectedComplex;

    // Filter by complex or gated community
    if (complexFilter) {
      vehicles = vehicles.filter((v) => v.complexId === complexFilter);
      codes = codes.filter((c) => c.complexId === complexFilter);
    } else if (this.filtersForm.selectedGatedCommunity) {
      vehicles = vehicles.filter((v) => v.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
      codes = codes.filter((c) => c.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
    }
    
    const regQuery = this.filtersForm.searchReg.trim().toLowerCase();
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
