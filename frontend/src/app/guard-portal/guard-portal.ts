// ...existing code...

  // Place these inside the GuardPortal class, after the constructor

import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { GuardPortalFiltersFormDTO } from '../interfaces/forms/guardPortalFiltersFormDTO';
import { ResponseBody } from '../interfaces/ResponseBody';
import { TenantFormDTO } from '../interfaces/forms/tenantFormDTO';
import { VehicleFormDTO } from '../interfaces/forms/vehicleFormDTO';
import { DataService } from '../services/data.service';
import { StorageService } from '../services/storage.service';
import { MatDialog } from '@angular/material/dialog';
import { BookVisitor } from '../dashboard/visitors/book-visitor/book-visitor';

@Component({
  selector: 'app-guard-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guard-portal.html',
  styleUrl: './guard-portal.css',
})
export class GuardPortal implements OnInit, OnDestroy {
  private dialog = inject(MatDialog);
  visitorList: any;
  // Dynamic filtered lists for residents and vehicles by unit search
  protected get filteredResidents(): any[] {
    const unitQuery = (this.filtersForm.searchUnit || '').trim().toLowerCase();
    if (!unitQuery) {
      return Array.isArray(this.residents) ? [...this.residents] : [];
    }
    return (Array.isArray(this.residents) ? this.residents : []).filter(resident => {
      const unit = (resident.unit || resident.houseNumber || '').toString().toLowerCase();
      return unit.includes(unitQuery);
    });
  }

  // No need to assign filtered lists, just trigger change detection
  private updateFilteredLists(): void {
    this.cdr.markForCheck();
  }

  openBookVisitorModal(resident?: any): void {
    this.dialog.open(BookVisitor, {
      width: '600px',
      disableClose: false,
      data: resident ? { resident } : undefined
    });
  }
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

  // Utility to check if station is selected/locked
  protected get isStationSelected(): boolean {
    return this.stationLocked && this.hasValidStationSelection();
  }
  protected toastVisible = false;
  protected toastMessage = '';
  private toastTimeoutId: number | null = null;
  protected isHoldingSos = false;
  protected showSosSuccess = false;
  protected isPhotoCameraModalOpen = false;
  protected isResidentPhotoModalOpen = false;
  protected isCodeVehicleModalOpen = false;
  protected selectedResidentPhotoUrl = '';
  protected selectedResidentInitials = '';
  protected selectedCodeVehicle: any | null = null;
  protected selectedCodeVisitorName = '';
  protected isTenantModalOpen = false;
  protected cameraError = '';
  protected isSavingProfilePhoto = false;
  protected hasCameraStream = false;
  protected guardPhotoData = '';
  protected tenantError = '';
  protected tenantSuccess = '';
  protected canRegisterTenant = false;
  protected showStationPrompt = false;
  protected stationLocked = false;
  protected stationType: 'gated' | 'complex' | '' = '';

  protected tenantForm: TenantFormDTO = {
    id: '',
    name: '',
    surname: '',
    email: '',
    phone: '',
    idNumber: '',
    residenceType: 'complex',
    complexId: '',
    communityId: '',
    communityResidenceType: 'house',
    communityComplexId: '',
    address: '',
    vehicles: [],
  };

  protected currentVehicle: VehicleFormDTO = {
    make: '',
    model: '',
    reg: '',
    color: '',
  };

  private sosHoldTimer: number | null = null;
  private sosAutoCloseTimer: number | null = null;
  private profileCameraStream: MediaStream | null = null;
  protected guardName = 'James Mthembu';
  protected guardPhotoUrl = '';
  protected activeShiftStationName = '';
  private activeShiftId = '';
  private currentShiftStartAt: Date | null = null;
  private pendingActiveShift: any | null | undefined = undefined;
  private stationContextReady = false;
  private restoredStationComplexName = '';
  private effectiveGuardId = '';
  private readonly stationStorageKey = 'equasec.guard.station';
  private readonly shiftWindowHours = 12;
  private readonly platformId = inject(PLATFORM_ID);
  private assignedComplexIds = new Set<string>();
  private assignedCommunityIds = new Set<string>();
  private availableTenantResidenceTypesCache: Array<{ value: 'complex' | 'community'; label: string }> = [];
  private availableTenantResidenceTypesKey = '';
  private availableCommunityResidenceTypesCache: Array<'house' | 'complex'> = [];
  private availableCommunityResidenceTypesKey = '';
  private availableUnitsCache: string[] = [];
  private availableUnitsKey = '';
  private availableHousesCache: string[] = [];
  private availableHousesKey = '';
  private availableCommunityComplexesCache: Array<{ id: string; name: string; units: string[] }> = [];
  private availableCommunityComplexesKey = '';
  private availableCommunityUnitsCache: string[] = [];
  private availableCommunityUnitsKey = '';

  constructor(
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly dataService: DataService,
    private readonly storage: StorageService,
  ) {}

  // Helper: filter registered vehicles by reg search
  protected get filteredRegisteredVehiclesByReg() {
      let regQuery = (this.filtersForm.searchReg || '').toString().trim().toLowerCase().replace(/\s+/g, '');
      let vehicles = this.vehicles;
      let filtered = vehicles;
      if (regQuery) {
        filtered = vehicles.filter(v => {
          let regValue = (v.regNumber || '').toString().trim().toLowerCase().replace(/\s+/g, '');
          return regValue.includes(regQuery);
        });
        // DEBUG: If no vehicles match, show all vehicles to help diagnose
        if (filtered.length === 0 && vehicles.length > 0) {
          return vehicles.map(v => ({ ...v, isVisitor: false, debug: true }));
        }
      }
      return filtered.map(v => ({ ...v, isVisitor: false }));
  }

  // Helper: filter visitor vehicles (from active codes) by reg search
  protected get filteredVisitorVehiclesByReg() {
      const regQuery = (this.filtersForm.searchReg || '').toString().trim().toLowerCase().replace(/\s+/g, '');
      return (Array.isArray(this.activeCodes) ? this.activeCodes : [])
        .filter(code => code.isDriving && code.vehicle)
        .filter(code => {
          // Normalize and check multiple possible registration properties
          let regValue = (code.vehicle.registration || code.vehicle.regNumber || code.vehicle.reg || '').toString().trim().toLowerCase().replace(/\s+/g, '');
          return regValue.includes(regQuery);
        })
        .map(code => ({
          make: code.vehicle?.makeModel?.split(' ')[0] || code.vehicle?.make || '',
          model: code.vehicle?.makeModel?.split(' ').slice(1).join(' ') || code.vehicle?.model || '',
          regNumber: code.vehicle?.registration || code.vehicle?.regNumber || code.vehicle?.reg || '',
          color: code.vehicle?.color || '',
          unit: code.unit || '',
          houseNumber: code.houseNumber || '',
          owner: code.visitorName || '',
          complexId: code.complexId || '',
          gatedCommunityId: code.gatedCommunityId || '',
          isVisitor: true
        }));
  }

  // Helper: filter residents by unit search
  protected get filteredResidentsByUnit() {
    const unitQuery = this.filtersForm.searchUnit.trim().toLowerCase();
    if (!unitQuery) return this.filteredResidents;
    return this.filteredResidents.filter(resident => (resident.unit || '').toLowerCase().includes(unitQuery));
  }

  // Helper: filter vehicles by unit search
  protected get filteredVehiclesByUnit() {
    const unitQuery = this.filtersForm.searchUnit.trim().toLowerCase();
    const registeredVehicles = this.filteredVehicles.filter(vehicle => !vehicle.isVisitor);
    if (!unitQuery) return registeredVehicles;
    return registeredVehicles.filter(vehicle => (vehicle.unit || '').toLowerCase().includes(unitQuery));
  }

  // Helper: filter active codes by unit search
  protected get filteredCodesByUnit() {
    const unitQuery = this.filtersForm.searchUnit.trim().toLowerCase();
    if (!unitQuery) return this.filteredCodes;
    return this.filteredCodes.filter(code => (code.unit || '').toLowerCase().includes(unitQuery));
  }
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
    if (this.activeShiftStationName) {
      return this.activeShiftStationName;
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

  protected get stationActionLabel(): string {
    return this.hasValidStationSelection() ? 'Change station' : 'Select station';
  }

  protected get shiftStartSaLabel(): string {
    if (!this.currentShiftStartAt) {
      return 'Not started';
    }

    const shiftStart = this.currentShiftStartAt;
    if (Number.isNaN(shiftStart.getTime())) {
      return 'Not started';
    }

    return new Intl.DateTimeFormat('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(shiftStart);
  }

  protected get unitSearchDisabled(): boolean {
    return false;
  }

  protected get residenceSearchLabel(): string {
    if (this.stationType === 'gated' && !this.filtersForm.selectedComplex) {
      return 'House No';
    }

    return 'Unit';
  }

  protected get residenceSearchPlaceholder(): string {
    if (this.stationType === 'gated' && !this.filtersForm.selectedComplex) {
      return 'e.g. 24';
    }

    return 'e.g. 402';
  }

  private stripResidencePrefix(value: string | undefined | null): string {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }

    return raw.replace(/^(unit|house\s*no\.?|house\s*number|house)\s*/i, '').trim();
  }

  protected formatResidenceBadge(value: string | undefined | null): string {
    const cleanedValue = this.stripResidencePrefix(value);
    const label = this.residenceSearchLabel;

    if (!cleanedValue) {
      return label;
    }

    return `${label} ${cleanedValue}`;
  }

  protected formatResidenceValue(value: string | undefined | null): string {
    return this.stripResidencePrefix(value);
  }

  ngOnInit(): void {
    this.loadActiveShiftFromGuardHistory();
    this.hydrateGuardFromStorage();
    this.loadGuardPortalData();
  }

  private loadActiveShiftFromGuardHistory(): void {
    this.dataService.get<any>('guardHistory/active').pipe(
      catchError(() => of({ payload: null })),
    ).subscribe((response) => {
     
      this.pendingActiveShift = response?.payload ?? null;
      
      if (this.stationContextReady) {
        this.applyStationFromCurrentShiftState();
      }
    });
  }
  protected gatedCommunities: Array<{
    id: string;
    name: string;
    complexes: Array<{ id: string; name: string; address?: string | null }>;
    houses: string[];
    complexesInCommunity: Array<{ id: string; name: string; units: string[]; address?: string | null }>;
  }> = [];

  protected assignedComplexes: Array<{ id: string; name: string; units: string[]; address?: string | null }> = [];

  protected standaloneComplexes: Array<{ id: string; name: string; address?: string | null }> = [];

  protected get complexes(): Array<{ id: string; name: string; address?: string | null }> {
    if (this.filtersForm.selectedGatedCommunity) {
      const gc = this.gatedCommunities.find((g) => g.id === this.filtersForm.selectedGatedCommunity);
      return gc?.complexes ?? [];
    }
    return this.standaloneComplexes;
  }

  protected residents: Array<{
    name: string;
    unit: string;
    houseNumber: string;
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
    houseNumber: string;
    owner: string;
    complexId: string;
    gatedCommunityId: string;
  }> = [];
  protected activeCodes: Array<any> = [];

  private shouldUseHouseNumberForStation(): boolean {
    return this.stationType === 'gated' && !this.filtersForm.selectedComplex;
  }

  private resolveResidenceNumber(unit: string | undefined | null, houseNumber: string | undefined | null): string {
    const normalizedUnit = String(unit ?? '').trim();
    const normalizedHouseNumber = String(houseNumber ?? '').trim();

    if (this.shouldUseHouseNumberForStation() && normalizedHouseNumber.length > 0) {
      return normalizedHouseNumber;
    }

    return normalizedUnit || normalizedHouseNumber;
  }

  private normalizeName(value: string | undefined | null): string {
    return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private hasTenantRole(typeValue: unknown): boolean {
    if (Array.isArray(typeValue)) {
      return typeValue.some((role) => {
        const normalizedRole = this.normalizeName(String(role ?? ''));
        return normalizedRole === 'tenant' || normalizedRole === 'tenat';
      });
    }

    const normalizedRole = this.normalizeName(String(typeValue ?? ''));
    return normalizedRole === 'tenant' || normalizedRole === 'tenat';
  }

  private ensureArray<T = any>(value: unknown): T[] {
    if (Array.isArray(value)) {
      return value as T[];
    }

    if (value && typeof value === 'object') {
      const payload = (value as { payload?: unknown }).payload;
      if (Array.isArray(payload)) {
        return payload as T[];
      }
    }

    return [];
  }

  private hydrateGuardFromStorage(): void {
    const currentUser = this.getStoredCurrentUser();
    if (!currentUser) {
      return;
    }

    const fullName = `${currentUser?.name ?? ''} ${currentUser?.surname ?? ''}`.trim();
    if (fullName) {
      this.guardName = fullName;
    }
    this.guardPhotoUrl = currentUser?.profilePhoto ?? this.guardPhotoUrl;
    this.canRegisterTenant = this.isAdminGuard(currentUser);
  }

  private getStoredCurrentUser(): any | null {
    const rawUser =
      this.storage?.getItem?.('current-user') ??
      (isPlatformBrowser(this.platformId) ? window.localStorage.getItem('current-user') : null);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }

  private loadGuardPortalData(): void {
    this.dataService
      .get<any>('user/current')
      .pipe(
        switchMap((currentUserResponse) => {
          const currentUserPayload = currentUserResponse?.payload ?? currentUserResponse ?? null;
          const storedCurrentUser = this.getStoredCurrentUser();
          const currentUser = currentUserPayload && typeof currentUserPayload === 'object'
            ? currentUserPayload
            : (storedCurrentUser ?? null);

          if (currentUser) {
            this.guardName = `${currentUser.name ?? ''} ${currentUser.surname ?? ''}`.trim() || this.guardName;
            this.guardPhotoUrl = currentUser.profilePhoto ?? '';
            this.canRegisterTenant = this.isAdminGuard(currentUser);
          }

          this.assignedComplexIds = new Set(
            Array.isArray(currentUser?.assignedComplexes)
              ? currentUser.assignedComplexes.map((value: unknown) => String(value ?? '')).filter((value: string) => value.length > 0)
              : Array.isArray(storedCurrentUser?.assignedComplexes)
              ? storedCurrentUser.assignedComplexes.map((value: unknown) => String(value ?? '')).filter((value: string) => value.length > 0)
              : []
          );
          this.assignedCommunityIds = new Set(
            Array.isArray(currentUser?.assignedCommunities)
              ? currentUser.assignedCommunities.map((value: unknown) => String(value ?? '')).filter((value: string) => value.length > 0)
              : Array.isArray(storedCurrentUser?.assignedCommunities)
              ? storedCurrentUser.assignedCommunities.map((value: unknown) => String(value ?? '')).filter((value: string) => value.length > 0)
              : []
          );

          const guardId = currentUser?._id as string | undefined;
          // Ensure guardId is set from current user
          let effectiveGuardId = guardId;
          if (!effectiveGuardId) {
            const currentUser = this.getStoredCurrentUser();
            effectiveGuardId = currentUser?._id ?? currentUser?.id ?? '';
          }
          this.effectiveGuardId = String(effectiveGuardId ?? '').trim();
          const visitors$ = effectiveGuardId
            ? this.dataService.get<any[]>('visitor/security/', { headers: { id: effectiveGuardId } })
            : of([]);
          return forkJoin({
            gated: this.dataService.get<any[]>('gatedCommunity').pipe(catchError(() => of([]))),
            complexes: this.dataService.get<any[]>('complex').pipe(catchError(() => of([]))),
            units: this.dataService.get<any[]>('unit').pipe(catchError(() => of([]))),
            users: this.dataService.get<any[]>('user').pipe(catchError(() => of([]))),
            vehicles: this.dataService.get<any[]>('vehicle').pipe(catchError(() => of([]))),
            visitors: visitors$.pipe(catchError(() => of([]))),
          });
        }),
        catchError(() =>
          forkJoin({
            gated: of([]),
            complexes: of([]),
            units: of([]),
            users: of([]),
            vehicles: of([]),
            visitors: of([]),
          })
        )
      )
      .subscribe(({ gated, complexes, units, users, vehicles, visitors }) => {
        const gatedList = this.ensureArray<any>(gated);
        const complexList = this.ensureArray<any>(complexes);
        const unitList = this.ensureArray<any>(units);
        const userList = this.ensureArray<any>(users);
        const vehicleList = this.ensureArray<any>(vehicles);
        this.visitorList = this.ensureArray<any>(visitors);

        this.cdr.markForCheck();
        this.stationContextReady = true;
        this.applyStationFromCurrentShiftState();

        const allGatedCommunities = gatedList.map((community) => ({
          id: this.normalizeStationId(community._id ?? community.id),
          name: community.name ?? '',
          complexes: [],
          houses: this.generateResidenceLabels(
            Number(community.numberOfHouses ?? 0),
            Number(community.unitStart ?? 0),
            Number(community.unitEnd ?? 0),
            'House'
          ),
          complexesInCommunity: [],
        }));

        const allComplexes = complexList.map((complex) => ({
          id: this.normalizeStationId(complex._id ?? complex.id),
          name: complex.name ?? '',
          address: String(complex.address ?? '').trim(),
          gatedCommunityName: complex.gatedCommunityName ?? '',
          units: this.generateResidenceLabels(
            Number(complex.numberOfUnits ?? 0),
            Number(complex.unitStart ?? 0),
            Number(complex.unitEnd ?? 0),
            'Unit'
          ),
        }));

        const hasAssignments = this.assignedComplexIds.size > 0 || this.assignedCommunityIds.size > 0;

        const allowedComplexes = hasAssignments
          ? allComplexes.filter((complex) => {
              const complexId = String(complex.id ?? '');
              return this.assignedComplexIds.has(complexId);
            })
          : [];

        const allowedComplexIdSet = new Set(allowedComplexes.map((complex) => String(complex.id)));

        const allowedGatedCommunityIds = new Set<string>(
          Array.from(this.assignedCommunityIds).filter((id) => id.length > 0)
        );

        this.ensureStationSelectionRequiredState();

        for (const complex of allowedComplexes) {
          const gatedName = this.normalizeName(complex.gatedCommunityName);
          if (!gatedName) {
            continue;
          }

          const matchedCommunity = allGatedCommunities.find((community) => this.normalizeName(community.name) === gatedName);
          if (matchedCommunity) {
            allowedGatedCommunityIds.add(matchedCommunity.id);
          }
        }

        this.gatedCommunities = allGatedCommunities
          .filter((community) => allowedGatedCommunityIds.has(community.id))
          .map((community) => ({
            ...community,
            complexes: allowedComplexes
              .filter((complex) => this.normalizeName(complex.gatedCommunityName) === this.normalizeName(community.name))
              .map((complex) => ({ id: complex.id, name: complex.name, address: complex.address })),
            complexesInCommunity: allowedComplexes
              .filter((complex) => this.normalizeName(complex.gatedCommunityName) === this.normalizeName(community.name))
              .map((complex) => ({ id: complex.id, name: complex.name, units: complex.units, address: complex.address })),
          }));

        this.standaloneComplexes = allowedComplexes
          .filter((complex) => !this.normalizeName(complex.gatedCommunityName))
          .map((complex) => ({ id: complex.id, name: complex.name, address: complex.address }));

        this.assignedComplexes = allowedComplexes.map((complex) => ({
          id: complex.id,
          name: complex.name,
          units: complex.units,
          address: complex.address,
        }));

        this.syncGatedComplexSelection();

        const tenantUserById = new Map<string, any>();
        for (const user of userList) {
          if (!this.hasTenantRole(user?.type)) {
            continue;
          }
          const userId = String(user?._id ?? user?.id ?? '').trim();
          if (!userId) {
            continue;
          }
          tenantUserById.set(userId, user);
        }

        const tenantLocationByUserId = new Map<string, {
          complexId: string;
          gatedCommunityId: string;
          houseNumber: string;
          unit: string;
        }>();

        for (const unit of unitList) {
          const complexId = this.normalizeStationId(unit?.complex?._id ?? unit?.complex?.id);
          const gatedCommunityId = this.normalizeStationId(unit?.gatedCommunity?._id ?? unit?.gatedCommunity?.id);
          const unitNumberRaw = unit?.number;
          const normalizedUnitNumber = String(unitNumberRaw ?? '').trim();

          const linkedUsers = Array.isArray(unit?.users) ? unit.users : [];
          for (const linkedUser of linkedUsers) {
            const linkedUserId = String(
              (linkedUser && typeof linkedUser === 'object')
                ? (linkedUser as any)?._id ?? (linkedUser as any)?.id ?? ''
                : linkedUser ?? ''
            ).trim();

            if (!linkedUserId) {
              continue;
            }

            const previous = tenantLocationByUserId.get(linkedUserId);
            const unitValue = normalizedUnitNumber || previous?.unit || '';
            const houseNumberValue = (!complexId && normalizedUnitNumber) || previous?.houseNumber || '';

            tenantLocationByUserId.set(linkedUserId, {
              complexId: complexId || previous?.complexId || '',
              gatedCommunityId: gatedCommunityId || previous?.gatedCommunityId || '',
              houseNumber: houseNumberValue,
              unit: unitValue,
            });
          }
        }

        this.residents = userList
          .filter((user) => this.hasTenantRole(user?.type))
          .map((user) => {
            const userId = String(user?._id ?? user?.id ?? '').trim();
            const linkedTenantLocation = userId ? tenantLocationByUserId.get(userId) : null;

            return {
              name: `${user.name ?? ''} ${user.surname ?? ''}`.trim(),
              unit: linkedTenantLocation?.unit ?? user.unit ?? user.address ?? user.unitNumber ?? user.houseNumber ?? '',
              houseNumber: linkedTenantLocation?.houseNumber ?? user.houseNumber ?? '',
              cellphone: user.cellNumber ?? '',
              email: user.emailAddress ?? '',
              photoDataUrl: user.profilePhoto ?? '',
              complexId: linkedTenantLocation?.complexId ?? this.normalizeStationId(user.complex?._id ?? user.complex?.id),
              gatedCommunityId: linkedTenantLocation?.gatedCommunityId ?? this.normalizeStationId(user.communityId ?? user.gatedCommunity?._id ?? user.gatedCommunity?.id),
            };
          })
          .filter((resident) => {
            if (!hasAssignments) {
              return false;
            }
            const inComplex = resident.complexId && allowedComplexIdSet.has(String(resident.complexId));
            const inCommunity = resident.gatedCommunityId && allowedGatedCommunityIds.has(String(resident.gatedCommunityId));
            return Boolean(inComplex || inCommunity);
          });


        const tenantVehiclesFromUsers = userList
          .filter((user) => this.hasTenantRole(user?.type))
          .flatMap((user) => {
            const userId = String(user?._id ?? user?.id ?? '').trim();
            const linkedTenantLocation = userId ? tenantLocationByUserId.get(userId) : null;
            const ownerName = `${user?.name ?? ''} ${user?.surname ?? ''}`.trim();
            const unit = linkedTenantLocation?.unit ?? user?.unit ?? user?.address ?? user?.unitNumber ?? user?.houseNumber ?? '';
            const houseNumber = linkedTenantLocation?.houseNumber ?? user?.houseNumber ?? '';
            const complexId = linkedTenantLocation?.complexId ?? this.normalizeStationId(user?.complex?._id ?? user?.complex?.id);
            const gatedCommunityId = linkedTenantLocation?.gatedCommunityId ?? this.normalizeStationId(user?.communityId ?? user?.gatedCommunity?._id ?? user?.gatedCommunity?.id);

            const userVehicles = Array.isArray(user?.vehicles) ? user.vehicles : [];
            return userVehicles.map((vehicle: any) => ({
              make: vehicle?.make ?? '',
              model: vehicle?.model ?? '',
              regNumber: vehicle?.reg ?? vehicle?.regNumber ?? vehicle?.registerationNumber ?? '',
              color: vehicle?.color ?? '',
              unit,
              houseNumber,
              owner: ownerName,
              complexId,
              gatedCommunityId,
            }));
          });

        const vehiclesFromVehicleCollection = vehicleList.map((vehicle) => {
          const linkedUserId = String(vehicle?.user?._id ?? vehicle?.user?.id ?? '').trim();
          const linkedTenant = linkedUserId ? tenantUserById.get(linkedUserId) : null;
          const linkedTenantLocation = linkedUserId ? tenantLocationByUserId.get(linkedUserId) : null;

          const resolvedUnit =
            linkedTenantLocation?.unit ??
            linkedTenant?.unit ??
            linkedTenant?.address ??
            linkedTenant?.unitNumber ??
            linkedTenant?.houseNumber ??
            vehicle?.unit ??
            vehicle?.user?.unit ??
            vehicle?.user?.address ??
            vehicle?.user?.unitNumber ??
            vehicle?.user?.houseNumber ??
            '';

          const resolvedHouseNumber =
            linkedTenantLocation?.houseNumber ??
            linkedTenant?.houseNumber ??
            vehicle?.user?.houseNumber ??
            '';

          const resolvedOwner =
            `${linkedTenant?.name ?? vehicle?.user?.name ?? ''} ${linkedTenant?.surname ?? vehicle?.user?.surname ?? ''}`.trim();

          return {
            make: vehicle.make ?? '',
            model: vehicle.model ?? '',
            regNumber: vehicle.registerationNumber ?? vehicle.regNumber ?? '',
            color: vehicle.color ?? '',
            unit: resolvedUnit,
            houseNumber: resolvedHouseNumber,
            owner: resolvedOwner,
            complexId: linkedTenantLocation?.complexId ?? this.normalizeStationId(linkedTenant?.complex?._id ?? linkedTenant?.complex?.id ?? vehicle?.user?.complex?._id ?? vehicle?.user?.complex?.id),
            gatedCommunityId: linkedTenantLocation?.gatedCommunityId ?? this.normalizeStationId(linkedTenant?.communityId ?? linkedTenant?.gatedCommunity?._id ?? linkedTenant?.gatedCommunity?.id ?? vehicle?.user?.communityId ?? vehicle?.user?.gatedCommunity?._id ?? vehicle?.user?.gatedCommunity?.id),
          };
        });

        const mergedVehiclesMap = new Map<string, {
          make: string;
          model: string;
          regNumber: string;
          color: string;
          unit: string;
          houseNumber: string;
          owner: string;
          complexId: string;
          gatedCommunityId: string;
        }>();

        for (const vehicle of [...vehiclesFromVehicleCollection, ...tenantVehiclesFromUsers]) {
          const key = this.normalizeName(vehicle.regNumber);
          if (!key) {
            continue;
          }
          if (!mergedVehiclesMap.has(key)) {
            mergedVehiclesMap.set(key, vehicle);
          }
        }

        this.vehicles = Array.from(mergedVehiclesMap.values())
          .filter((vehicle) => {
            if (!hasAssignments) {
              return false;
            }
            const inComplex = vehicle.complexId && allowedComplexIdSet.has(String(vehicle.complexId));
            const inCommunity = vehicle.gatedCommunityId && allowedGatedCommunityIds.has(String(vehicle.gatedCommunityId));
            return Boolean(inComplex || inCommunity);
          });

        // Update filtered lists to show all residents and vehicles by default
        this.updateFilteredLists();


        const filteredVisitors = this.visitorList
          .filter((visitor: { validity?: boolean }) => visitor.validity === true)
          .filter((visitor: any, index: number, list: any[]) => {
            const visitorId = String(visitor?._id ?? visitor?.id ?? '').trim();
            const code = String(visitor?.code ?? '').trim();

            if (visitorId) {
              return index === list.findIndex((item: any) => String(item?._id ?? item?.id ?? '').trim() === visitorId);
            }

            if (code) {
              return index === list.findIndex((item: any) => String(item?.code ?? '').trim() === code);
            }

            return true;
          });
        this.activeCodes = filteredVisitors
          .map((visitor: any) => {
            // Map backend vehicle fields to frontend fields
            let mappedVehicle = undefined;
            if (visitor.vehicle) {
              mappedVehicle = {
                makeModel: `${visitor.vehicle.make ?? ''} ${visitor.vehicle.model ?? ''}`.trim(),
                registration: visitor.vehicle.registrationNumber ?? visitor.vehicle.registerationNumber ?? visitor.vehicle.registration ?? '',
                color: visitor.vehicle.colour ?? visitor.vehicle.color ?? '',
                make: visitor.vehicle.make ?? '',
                model: visitor.vehicle.model ?? '',
                regNumber: visitor.vehicle.registrationNumber ?? visitor.vehicle.registerationNumber ?? visitor.vehicle.registration ?? '',
              };
            }
            return {
              visitorId: String(visitor._id ?? visitor.id ?? ''),
              code: String(visitor.code ?? ''),
              visitorName: `${visitor.name ?? ''} ${visitor.surname ?? ''}`.trim(),
              tenantName: `${visitor.user?.name ?? ''} ${visitor.user?.surname ?? ''}`.trim(),
              cellphone: visitor.contact ?? '',
              unit: visitor.user?.unit ?? '',
              houseNumber: visitor.user?.houseNumber ?? '',
              expires: this.formatExpiryLabel(visitor.expiry),
              expiryRaw: visitor.expiry ?? null,
              isDriving: Boolean(visitor.driving),
              complexId: this.normalizeStationId(visitor.user?.complexId),
              gatedCommunityId: this.normalizeStationId(visitor.user?.gatedCommunityId),
              validity: visitor.validity !== false,
              access: visitor.access === true,
              vehicle: mappedVehicle,
            };
          })
          .filter((visitorCode: { complexId: any; gatedCommunityId: any; }) => {
            if (!hasAssignments) {
              return false;
            }
            const complexIdStr = String(visitorCode.complexId ?? '');
            const communityIdStr = String(visitorCode.gatedCommunityId ?? '');
            const inComplex = complexIdStr && allowedComplexIdSet.has(complexIdStr);
            const inCommunity = communityIdStr && allowedGatedCommunityIds.has(communityIdStr);
            const result = Boolean(inComplex || inCommunity);
            return result;
          });
        // ...


        this.stationContextReady = true;
        this.applyStationFromCurrentShiftState();
        this.ensureStationSelectionRequiredState();
        console.log('[GuardPortal][data] station and view state', {
          stationType: this.stationType,
          selectedComplex: this.filtersForm.selectedComplex,
          selectedGatedCommunity: this.filtersForm.selectedGatedCommunity,
          selectedStationName: this.selectedStationName,
          showStationPrompt: this.showStationPrompt,
          showVehicles: this.showVehicles,
          showResidents: this.showResidents,
          showCodes: this.showCodes,
        });
        this.cdr.markForCheck();
      });
  }

  private applyStationFromCurrentShiftState(): void {
    this.restoreStationSelection();
    this.applyActiveShiftStation(this.pendingActiveShift);
    this.ensureStationSelectionRequiredState();

    if (this.pendingActiveShift === undefined) {
      this.restoreStationSelection();
      return;
    }

    if (this.pendingActiveShift) {
      this.restoreStationSelection();
      this.applyActiveShiftStation(this.pendingActiveShift);
      return;
    }

    this.restoreStationSelection();
    if (this.hasValidStationSelection() && this.isWithinShiftWindow(this.currentShiftStartAt)) {
      this.stationLocked = true;
      this.showStationPrompt = false;
      return;
    }

    this.activeShiftId = '';
    this.activeShiftStationName = '';
    this.currentShiftStartAt = null;
    this.stationLocked = false;
    this.showStationPrompt = true;
  }

  private isWithinShiftWindow(startAt: Date | null): boolean {
    if (!startAt) {
      return false;
    }

    const shiftStart = startAt.getTime();
    if (Number.isNaN(shiftStart)) {
      return false;
    }

    const elapsed = Date.now() - shiftStart;
    if (elapsed < 0) {
      return false;
    }

    return elapsed <= this.shiftWindowHours * 60 * 60 * 1000;
  }

  private applyActiveShiftStation(activeShift: any): void {
    const stationType = activeShift?.station?.type;
    const isStationTypeValid = stationType === 'gated' || stationType === 'complex';

    if (!isStationTypeValid) {
      this.activeShiftId = '';
      this.changeStation();
      return;
    }

    const stationName = String(activeShift?.station?.name ?? '').trim();
    let selectedGatedCommunity = this.normalizeStationId(activeShift?.station?.gatedCommunityId) || this.filtersForm.selectedGatedCommunity;
    let selectedComplex = this.normalizeStationId(activeShift?.station?.complexId) || this.filtersForm.selectedComplex;

    if (stationType === 'gated' && (!selectedGatedCommunity || !selectedComplex)) {
      const resolved = this.resolveGatedStationSelectionFromName(stationName);
      if (!selectedGatedCommunity && resolved.gatedCommunityId) {
        selectedGatedCommunity = resolved.gatedCommunityId;
      }
      if (!selectedComplex && resolved.complexId) {
        selectedComplex = resolved.complexId;
      }
    }

    if (stationType === 'complex' && !selectedComplex) {
      const matchedComplex = this.assignedComplexes.find(
        (complex) => this.normalizeName(complex.name) === this.normalizeName(stationName)
      );
      if (matchedComplex?.id) {
        selectedComplex = matchedComplex.id;
      }
    }

    this.activeShiftId = this.normalizeStationId(activeShift?._id);
    const shiftStart = new Date(activeShift?.startShift ?? '');
    this.currentShiftStartAt = Number.isNaN(shiftStart.getTime()) ? null : shiftStart;
    this.stationType = stationType;
    this.activeShiftStationName = stationName;
    this.filtersForm.selectedGatedCommunity = selectedGatedCommunity;
    this.filtersForm.selectedComplex = selectedComplex;
    this.syncGatedComplexSelection();
    this.applyStationSelectionSearchFields();
    this.stationLocked = true;
    this.showStationPrompt = false;
    this.persistStationSelection();
    this.ensureStationSelectionRequiredState();

  }

  private resolveGatedStationSelectionFromName(stationName: string): { gatedCommunityId: string; complexId: string } {
    const normalizedStationName = String(stationName ?? '').trim();
    if (!normalizedStationName) {
      return { gatedCommunityId: '', complexId: '' };
    }

    const parts = normalizedStationName
      .split(' - ')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (parts.length < 2) {
      return { gatedCommunityId: '', complexId: '' };
    }

    const gatedName = parts[parts.length - 1];
    const complexName = parts.slice(0, parts.length - 1).join(' - ');

    const matchedCommunity = this.gatedCommunities.find(
      (community) => this.normalizeName(community.name) === this.normalizeName(gatedName)
    );

    if (!matchedCommunity) {
      return { gatedCommunityId: '', complexId: '' };
    }

    const matchedComplex = (matchedCommunity.complexesInCommunity ?? []).find(
      (complex) => this.normalizeName(complex.name) === this.normalizeName(complexName)
    );

    return {
      gatedCommunityId: matchedCommunity.id,
      complexId: matchedComplex?.id ?? '',
    };
  }

  private hasValidStationSelection(): boolean {
    if (this.stationType === 'gated') {
      return this.filtersForm.selectedGatedCommunity.length > 0;
    }

    if (this.stationType === 'complex') {
      return this.filtersForm.selectedComplex.length > 0;
    }

    return false;
  }

  private ensureStationSelectionRequiredState(): void {
    if (this.activeShiftStationName && this.isWithinShiftWindow(this.currentShiftStartAt)) {
      this.stationLocked = true;
      this.showStationPrompt = false;
      return;
    }

    if (this.hasValidStationSelection()) {
      this.stationLocked = true;
      this.showStationPrompt = false;
      return;
    }

    this.stationLocked = false;
    this.showStationPrompt = true;
  }

  private normalizeStationId(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      const maybeId = value as { $oid?: unknown; _id?: unknown; toHexString?: () => string; toString?: () => string };
      if (typeof maybeId.toHexString === 'function') {
        return maybeId.toHexString();
      }

      if (maybeId.$oid) {
        return String(maybeId.$oid);
      }

      if (maybeId._id) {
        return this.normalizeStationId(maybeId._id);
      }

      if (typeof maybeId.toString === 'function') {
        const asString = maybeId.toString();
        if (asString && asString !== '[object Object]') {
          return asString;
        }
      }
    }

    return '';
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

 // Code search: only filter codes by code; Reg search: only filter codes with vehicles by reg
protected get filteredCodes() {
  const codeQuery = (this.filtersForm.searchCode || '').replace(/\D/g, '');
  const regQuery = (this.filtersForm.searchReg || '').trim().toLowerCase();
  const unitQuery = (this.filtersForm.searchUnit || '').trim().toLowerCase();
  let codes = Array.isArray(this.activeCodes) ? this.activeCodes : [];
  if (this.filtersForm.selectedComplex) {
    codes = codes.filter((code) => String(code.complexId) === String(this.filtersForm.selectedComplex));
  } else if (this.filtersForm.selectedGatedCommunity) {
    codes = codes.filter((code) => String(code.gatedCommunityId) === String(this.filtersForm.selectedGatedCommunity));
  }
  if (unitQuery) {
    codes = codes.filter((code) => {
      const residence = this.resolveResidenceNumber(code.unit, code.houseNumber).toLowerCase();
      return residence.includes(unitQuery);
    });
  }
  if (codeQuery) {
    return codes.filter((code) => code.code && code.code.includes(codeQuery));
  }
  if (regQuery) {
    // Only codes with vehicles, filter by registration
    return codes.filter((code) => code.vehicle && code.vehicle.registration && code.vehicle.registration.toLowerCase().includes(regQuery));
  }
  return codes;
}

  protected openTenantModal(): void {
    if (!this.canRegisterTenant) {
      return;
    }

    if (!this.hasValidStationSelection()) {
      this.tenantError = 'Select your current station before registering a tenant.';
      this.tenantSuccess = '';
      return;
    }

    this.isTenantModalOpen = true;
    this.tenantError = '';
    this.tenantSuccess = '';
    this.resetTenantForm();
  }

  protected closeTenantModal(): void {
    this.isTenantModalOpen = false;
    this.resetTenantForm();
  }

  protected submitTenantForm(): void {
    if (!this.tenantForm.name || !this.tenantForm.surname || !this.tenantForm.email || !this.tenantForm.phone || !this.tenantForm.address) {
      this.tenantError = 'Please fill in all required fields.';
      return;
    }

    this.tenantForm.phone = this.tenantForm.phone.trim();

    if (!/^0\d{9}$/.test(this.tenantForm.phone)) {
      this.tenantError = 'Phone number must be 10 digits and start with 0.';
      return;
    }

    const allowedResidenceTypes = this.availableTenantResidenceTypes.map((type) => type.value);
    if (!allowedResidenceTypes.includes(this.tenantForm.residenceType)) {
      this.tenantError = 'Selected residence type is not available for your assigned sites.';
      return;
    }

    if (this.tenantForm.residenceType === 'complex' && !this.tenantForm.complexId) {
      this.tenantError = 'Please select a complex.';
      return;
    }

    if (this.tenantForm.residenceType === 'community' && !this.tenantForm.communityId) {
      this.tenantError = 'Please select a gated community.';
      return;
    }

    if (this.tenantForm.residenceType === 'community' && this.tenantForm.communityResidenceType === 'complex' && !this.tenantForm.communityComplexId) {
      this.tenantError = 'Please select a complex within the gated community.';
      return;
    }

    if (this.tenantForm.residenceType === 'community' && !this.availableCommunityResidenceTypes.includes(this.tenantForm.communityResidenceType)) {
      this.tenantError = 'Selected community residence type is not available.';
      return;
    }

    const tenantData = {
      id: `tenant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: this.tenantForm.name.trim(),
      surname: this.tenantForm.surname.trim(),
      email: this.tenantForm.email.trim(),
      phone: this.tenantForm.phone.trim(),
      idNumber: this.tenantForm.idNumber.trim() || undefined,
      residenceType: this.tenantForm.residenceType,
      complexId: this.tenantForm.residenceType === 'complex' ? this.tenantForm.complexId : undefined,
      communityId: this.tenantForm.residenceType === 'community' ? this.tenantForm.communityId : undefined,
      communityResidenceType: this.tenantForm.residenceType === 'community' ? this.tenantForm.communityResidenceType : undefined,
      communityComplexId: this.tenantForm.residenceType === 'community' && this.tenantForm.communityResidenceType === 'complex' ? this.tenantForm.communityComplexId : undefined,
      address: this.tenantForm.address.trim(),
      vehicles: this.tenantForm.vehicles,
    };

    const normalizedTenantEmail = tenantData.email.trim().toLowerCase();
    const existingTenant = this.residents.find((resident) => resident.email?.trim().toLowerCase() === normalizedTenantEmail);
    if (existingTenant) {
      this.tenantError = 'A tenant with this email already exists.';
      return;
    }

    const selectedComplexForTenant =
      tenantData.residenceType === 'complex'
        ? this.assignedComplexes.find((complex) => complex.id === tenantData.complexId)
        : this.availableCommunityComplexes.find((complex) => complex.id === tenantData.communityComplexId);

    const payload = {
      name: tenantData.name,
      surname: tenantData.surname,
      emailAddress: normalizedTenantEmail,
      cellNumber: tenantData.phone,
      idNumber: tenantData.idNumber,
      address: tenantData.address,
      residenceType: tenantData.residenceType,
      complexId: tenantData.residenceType === 'complex' ? tenantData.complexId : tenantData.communityComplexId,
      complexName: selectedComplexForTenant?.name ?? '',
      communityId: tenantData.communityId,
      communityResidenceType: tenantData.communityResidenceType,
      communityComplexId: tenantData.communityComplexId,
      vehicles: tenantData.vehicles,
    };

    this.dataService.post<ResponseBody>('user/tenant', payload).subscribe({
      next: (response) => {
        const temporaryPin = response?.payload?.temporaryPin;
        this.tenantSuccess = temporaryPin
          ? `Tenant registered successfully! Temporary PIN: ${temporaryPin}`
          : 'Tenant registered successfully!';

        setTimeout(() => {
          this.closeTenantModal();
          this.loadGuardPortalData();
        }, 1500);
      },
      error: (error: HttpErrorResponse) => {
        this.tenantError = error?.error?.message || 'Unable to register tenant.';
      },
    });
  }

  protected addVehicle(): void {
    if (!this.currentVehicle.make || !this.currentVehicle.model || !this.currentVehicle.reg) {
      this.tenantError = 'Please fill in vehicle make, model, and registration number.';
      return;
    }

    if (this.tenantForm.vehicles.some((vehicle) => vehicle.reg.toLowerCase() === this.currentVehicle.reg.trim().toLowerCase())) {
      this.tenantError = 'A vehicle with this registration number is already added.';
      return;
    }

    this.tenantForm.vehicles.push({
      make: this.currentVehicle.make.trim(),
      model: this.currentVehicle.model.trim(),
      reg: this.currentVehicle.reg.trim(),
      color: this.currentVehicle.color.trim(),
    });

    this.currentVehicle = {
      make: '',
      model: '',
      reg: '',
      color: '',
    };
    this.tenantError = '';
  }

  protected removeVehicle(index: number): void {
    this.tenantForm.vehicles.splice(index, 1);
  }

  protected onResidenceTypeChange(): void {
    const availableTypes = this.availableTenantResidenceTypes.map((type) => type.value);
    if (!availableTypes.includes(this.tenantForm.residenceType)) {
      this.tenantForm.residenceType = availableTypes[0] as 'complex' | 'community';
    }

    this.tenantForm.complexId = '';
    this.tenantForm.communityId = '';
    this.tenantForm.communityComplexId = '';
    this.tenantForm.address = '';
  }

  protected onComplexChange(): void {
    this.tenantForm.address = '';
  }

  protected onCommunityChange(): void {
    const availableTypes = this.availableCommunityResidenceTypes;
    this.tenantForm.communityResidenceType =
      availableTypes.includes('house')
        ? 'house'
        : (availableTypes[0] ?? 'house');
    this.tenantForm.communityComplexId = '';
    this.tenantForm.address = '';
  }

  protected onCommunityResidenceTypeChange(): void {
    this.tenantForm.communityComplexId = '';
    this.tenantForm.address = '';
  }

  protected onCommunityComplexChange(): void {
    this.tenantForm.address = '';
  }

  protected get availableTenantResidenceTypes(): Array<{ value: 'complex' | 'community'; label: string }> {
    const key = `${this.stationType}|${this.filtersForm.selectedComplex}|${this.filtersForm.selectedGatedCommunity}`;
    if (this.availableTenantResidenceTypesKey === key) {
      return this.availableTenantResidenceTypesCache;
    }

    const types: Array<{ value: 'complex' | 'community'; label: string }> = [];

    if (this.stationType === 'complex' && this.filtersForm.selectedComplex) {
      types.push({ value: 'complex', label: 'Complex/Apartment' });
    }

    if (this.stationType === 'gated' && this.filtersForm.selectedGatedCommunity) {
      types.push({ value: 'community', label: 'Gated Community' });
    }

    this.availableTenantResidenceTypesCache = types;
    this.availableTenantResidenceTypesKey = key;
    return this.availableTenantResidenceTypesCache;
  }

  protected get availableCommunityResidenceTypes(): Array<'house' | 'complex'> {
    const key = `${this.tenantForm.communityId}|${this.filtersForm.selectedComplex}|${this.gatedCommunities.length}`;
    if (this.availableCommunityResidenceTypesKey === key) {
      return this.availableCommunityResidenceTypesCache;
    }

    if (!this.tenantForm.communityId) {
      this.availableCommunityResidenceTypesCache = ['house', 'complex'];
      this.availableCommunityResidenceTypesKey = key;
      return this.availableCommunityResidenceTypesCache;
    }

    const community = this.gatedCommunities.find((item) => item.id === this.tenantForm.communityId);
    if (!community) {
      this.availableCommunityResidenceTypesCache = ['house', 'complex'];
      this.availableCommunityResidenceTypesKey = key;
      return this.availableCommunityResidenceTypesCache;
    }

    if (this.stationType === 'gated' && this.filtersForm.selectedComplex) {
      this.availableCommunityResidenceTypesCache = ['complex'];
      this.availableCommunityResidenceTypesKey = key;
      return this.availableCommunityResidenceTypesCache;
    }

    const types: Array<'house' | 'complex'> = [];
    if ((community.houses?.length ?? 0) > 0) {
      types.push('house');
    }
    if ((community.complexesInCommunity?.length ?? 0) > 0) {
      types.push('complex');
    }

    this.availableCommunityResidenceTypesCache = types.length > 0 ? types : ['house'];
    this.availableCommunityResidenceTypesKey = key;
    return this.availableCommunityResidenceTypesCache;
  }

  protected get availableUnits(): string[] {
    const key = `${this.tenantForm.complexId}|${this.stationScopedComplexes.length}`;
    if (this.availableUnitsKey === key) {
      return this.availableUnitsCache;
    }

    if (!this.tenantForm.complexId) {
      this.availableUnitsCache = [];
      this.availableUnitsKey = key;
      return this.availableUnitsCache;
    }

    const complex = this.stationScopedComplexes.find((item) => item.id === this.tenantForm.complexId);
    this.availableUnitsCache = complex?.units ?? [];
    this.availableUnitsKey = key;
    return this.availableUnitsCache;
  }

  protected get availableHouses(): string[] {
    const key = `${this.tenantForm.communityId}|${this.stationType}|${this.filtersForm.selectedComplex}|${this.gatedCommunities.length}`;
    if (this.availableHousesKey === key) {
      return this.availableHousesCache;
    }

    if (!this.tenantForm.communityId) {
      this.availableHousesCache = [];
      this.availableHousesKey = key;
      return this.availableHousesCache;
    }

    const community = this.stationScopedCommunities.find((item) => item.id === this.tenantForm.communityId);
    if (this.stationType === 'gated' && this.filtersForm.selectedComplex) {
      this.availableHousesCache = [];
      this.availableHousesKey = key;
      return this.availableHousesCache;
    }

    this.availableHousesCache = community?.houses ?? [];
    this.availableHousesKey = key;
    return this.availableHousesCache;
  }

  protected get availableCommunityComplexes(): Array<{ id: string; name: string; units: string[]; address?: string | null }> {
    const key = `${this.tenantForm.communityId}|${this.stationType}|${this.filtersForm.selectedComplex}|${this.gatedCommunities.length}`;
    if (this.availableCommunityComplexesKey === key) {
      return this.availableCommunityComplexesCache;
    }

    if (!this.tenantForm.communityId) {
      this.availableCommunityComplexesCache = [];
      this.availableCommunityComplexesKey = key;
      return this.availableCommunityComplexesCache;
    }

    const community = this.stationScopedCommunities.find((item) => item.id === this.tenantForm.communityId);
    const communityComplexes = community?.complexesInCommunity ?? [];
    this.availableCommunityComplexesCache =
      this.stationType === 'gated' && this.filtersForm.selectedComplex
        ? communityComplexes.filter((item) => item.id === this.filtersForm.selectedComplex)
        : communityComplexes;
    this.availableCommunityComplexesKey = key;
    return this.availableCommunityComplexesCache;
  }

  protected get availableCommunityUnits(): string[] {
    const key = `${this.tenantForm.communityId}|${this.tenantForm.communityComplexId}|${this.gatedCommunities.length}`;
    if (this.availableCommunityUnitsKey === key) {
      return this.availableCommunityUnitsCache;
    }

    if (!this.tenantForm.communityComplexId) {
      this.availableCommunityUnitsCache = [];
      this.availableCommunityUnitsKey = key;
      return this.availableCommunityUnitsCache;
    }

    const community = this.gatedCommunities.find((item) => item.id === this.tenantForm.communityId);
    const complex = community?.complexesInCommunity?.find((item) => item.id === this.tenantForm.communityComplexId);
    this.availableCommunityUnitsCache = complex?.units ?? [];
    this.availableCommunityUnitsKey = key;
    return this.availableCommunityUnitsCache;
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
    this.syncGatedComplexSelection();
  }

  private syncGatedComplexSelection(): void {
    if (this.stationType !== 'gated') {
      return;
    }

    if (!this.filtersForm.selectedComplex) {
      return;
    }

    const selectedCommunity = this.gatedCommunities.find(
      (community) => community.id === this.filtersForm.selectedGatedCommunity
    );

    if (!selectedCommunity) {
      return;
    }

    const availableComplexIds = new Set(
      (selectedCommunity.complexesInCommunity ?? []).map((complex) => String(complex.id ?? ''))
    );

    if (availableComplexIds.has(this.filtersForm.selectedComplex)) {
      return;
    }

    const restoredNameKey = this.normalizeName(this.restoredStationComplexName);
    if (restoredNameKey) {
      const matchedByName = (selectedCommunity.complexesInCommunity ?? []).find(
        (complex) => this.normalizeName(complex.name) === restoredNameKey
      );

      if (matchedByName?.id) {
        this.filtersForm.selectedComplex = String(matchedByName.id);
        return;
      }
    }

    this.filtersForm.selectedComplex = '';
    this.filtersForm.searchComplex = '';
    this.filtersForm.searchComplexFilter = '';
  }

  private resolveSelectedComplexNameForStationCache(): string {
    if (!this.filtersForm.selectedComplex) {
      return '';
    }

    return (
      this.assignedComplexes.find((complex) => complex.id === this.filtersForm.selectedComplex)?.name ??
      this.complexes.find((complex) => complex.id === this.filtersForm.selectedComplex)?.name ??
      ''
    );
  }

  protected confirmStationSelection(): void {
    if (!this.stationSelectionReady) {
      this.ensureStationSelectionRequiredState();
      return;
    }

    this.applyStationSelectionSearchFields();

    this.filtersForm.searchUnit = '';
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
    this.activeShiftStationName = this.selectedStationName;
    this.showStationPrompt = false;
    this.stationLocked = true;
    this.persistStationSelection();
    this.saveGuardHistoryShift();
    this.ensureStationSelectionRequiredState();
  }

  protected changeStation(): void {
    this.stationLocked = false;
    this.showStationPrompt = true;
    console.log('DEBUG: changeStation called, showStationPrompt =', this.showStationPrompt);
    this.activeShiftStationName = '';
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

  private persistStationSelection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const selectedComplexName = this.resolveSelectedComplexNameForStationCache();
    this.restoredStationComplexName = selectedComplexName;

    const payload = {
      stationType: this.stationType,
      selectedGatedCommunity: this.filtersForm.selectedGatedCommunity,
      selectedComplex: this.filtersForm.selectedComplex,
      selectedComplexName,
      activeShiftId: this.activeShiftId,
      shiftStartedAt: this.currentShiftStartAt?.toISOString() ?? '',
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
        selectedComplexName?: string;
        activeShiftId?: string;
        shiftStartedAt?: string;
      };

      if (!parsed.stationType) {
        return;
      }

      this.stationType = parsed.stationType;
      this.filtersForm.selectedGatedCommunity = parsed.selectedGatedCommunity ?? '';
      this.filtersForm.selectedComplex = parsed.selectedComplex ?? '';
      this.restoredStationComplexName = String(parsed.selectedComplexName ?? '').trim();
      this.activeShiftId = parsed.activeShiftId ?? '';
      const shiftStart = new Date(parsed.shiftStartedAt ?? '');
      this.currentShiftStartAt = Number.isNaN(shiftStart.getTime()) ? null : shiftStart;

      this.syncGatedComplexSelection();
      this.applyStationSelectionSearchFields();

      this.showStationPrompt = false;
      this.stationLocked = true;

    } catch {
      this.clearStationSelection();
    }
  }

  private applyStationSelectionSearchFields(): void {
    if (this.stationType === 'gated') {
      this.filtersForm.searchGatedCommunity = this.selectedGatedCommunityName;
      this.filtersForm.searchComplex = this.filtersForm.selectedComplex ? this.selectedComplexName : '';
      this.filtersForm.searchComplexFilter = this.filtersForm.selectedComplex || '';
      return;
    }

    if (this.stationType === 'complex') {
      this.filtersForm.searchComplex = this.selectedComplexName;
      this.filtersForm.selectedGatedCommunity = '';
      this.filtersForm.searchGatedCommunity = '';
      this.filtersForm.searchComplexFilter = '';
    }
  }

  private clearStationSelection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.currentShiftStartAt = null;
    window.localStorage.removeItem(this.stationStorageKey);
  }

  private saveGuardHistoryShift(): void {
    const stationName = this.selectedStationName;
    if (!this.hasValidStationSelection() || !stationName || stationName === 'Select station') {
      this.ensureStationSelectionRequiredState();
      return;
    }

    const payload = {
      stationType: this.stationType,
      selectedGatedCommunity: this.filtersForm.selectedGatedCommunity || '',
      selectedComplex: this.filtersForm.selectedComplex || '',
      stationName,
    };

    if (this.activeShiftId) {
      this.dataService.put<any>('guardHistory/active/station', payload).subscribe({
        next: (response) => {
          const updatedShiftId = this.normalizeStationId(response?.payload?._id);
          if (updatedShiftId) {
            this.activeShiftId = updatedShiftId;
          }
          const shiftStart = new Date(response?.payload?.startShift ?? '');
          if (!Number.isNaN(shiftStart.getTime())) {
            this.currentShiftStartAt = shiftStart;
          }
          this.persistStationSelection();
        },
        error: () => {
          this.activeShiftId = '';
          this.dataService.post<any>('guardHistory/start', payload).subscribe({
            next: (response) => {
              this.activeShiftId = this.normalizeStationId(response?.payload?._id);
              const shiftStart = new Date(response?.payload?.startShift ?? '');
              this.currentShiftStartAt = Number.isNaN(shiftStart.getTime()) ? null : shiftStart;
              this.persistStationSelection();
            },
            error: () => undefined,
          });
        },
      });
      return;
    }

    this.dataService.post<any>('guardHistory/start', payload).subscribe({
      next: (response) => {
        this.activeShiftId = this.normalizeStationId(response?.payload?._id);
        const shiftStart = new Date(response?.payload?.startShift ?? '');
        this.currentShiftStartAt = Number.isNaN(shiftStart.getTime()) ? null : shiftStart;
        this.persistStationSelection();
      },
      error: () => undefined,
    });
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
  // Always show all sections
  this.showCodes = true;
  this.showResidents = true;
  this.showVehicles = true;
  if (activeField === 'unit') {
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
    this.showRegOptions = false;
  } else if (activeField === 'reg') {
    this.filtersForm.searchCode = '';
    this.filtersForm.searchUnit = '';
    this.showUnitOptions = false;
  } else if (activeField === 'code') {
    this.filtersForm.searchUnit = '';
    this.filtersForm.searchReg = '';
    this.showUnitOptions = false;
    this.showRegOptions = false;
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
    let residents = Array.isArray(this.residents) ? this.residents : [];
    let vehicles = Array.isArray(this.vehicles) ? this.vehicles : [];
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
      ...residents.map((resident) => this.resolveResidenceNumber(resident.unit, resident.houseNumber)),
      ...vehicles.map((vehicle) => this.resolveResidenceNumber(vehicle.unit, vehicle.houseNumber)),
    ]);
    const list = Array.from(units).sort();
    const query = this.filtersForm.searchUnit.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((unit) => unit.toLowerCase().includes(query));
  }

  protected get filteredRegOptions(): string[] {
    let vehicles = Array.isArray(this.vehicles) ? this.vehicles : [];
    let codes = Array.isArray(this.activeCodes) ? this.activeCodes : [];
    const complexFilter = this.filtersForm.searchComplexFilter || this.filtersForm.selectedComplex;

    // Filter by complex or gated community
    if (complexFilter) {
      vehicles = vehicles.filter((v) => v.complexId === complexFilter);
      codes = codes.filter((c) => c.complexId === complexFilter);
    } else if (this.filtersForm.selectedGatedCommunity) {
      vehicles = vehicles.filter((v) => v.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
      codes = codes.filter((c) => c.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
    }

    const normalizeReg = (value: string): string => value.toLowerCase().replace(/\s+/g, '');

    const vehicleRegs = vehicles
      .map((vehicle) => (vehicle.regNumber || '').trim())
      .filter(Boolean);

    const visitorRegs = codes
      .filter((code) => code.vehicle)
      .map((code) => (code.vehicle?.registration || code.vehicle?.regNumber || code.vehicle?.reg || '').trim())
      .filter(Boolean);

    const merged = [...vehicleRegs, ...visitorRegs];
    const uniqueMap = new Map<string, string>();
    for (const reg of merged) {
      const key = normalizeReg(reg);
      if (!key || uniqueMap.has(key)) {
        continue;
      }
      uniqueMap.set(key, reg);
    }

    const list = Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
    const query = normalizeReg(this.filtersForm.searchReg.trim());
    if (!query) {
      return list;
    }
    return list.filter((reg) => normalizeReg(reg).includes(query));
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
    const mappedCodes = codes.map((code) => ({
      ...code,
      unit: this.resolveResidenceNumber(code.unit, code.houseNumber),
    }));

    if (!unitQuery) {
      return [];
    }
    return mappedCodes.filter((code) => code.unit.toLowerCase().includes(unitQuery));
  }

  

  protected get filteredVehicles() {
    const complexFilter = this.filtersForm.searchComplexFilter || this.filtersForm.selectedComplex;
    let vehicles = this.vehicles;
    // Filter by complex or gated community
    if (complexFilter) {
      vehicles = vehicles.filter((v) => v.complexId === complexFilter);
    } else if (this.filtersForm.selectedGatedCommunity) {
      vehicles = vehicles.filter((v) => v.gatedCommunityId === this.filtersForm.selectedGatedCommunity);
    }

    const unitQuery = this.filtersForm.searchUnit.trim().toLowerCase();
    const regQuery = this.filtersForm.searchReg.trim().toLowerCase();

    // Visitor code vehicles (from activeCodes)
    const visitorVehicles = (Array.isArray(this.activeCodes) ? this.activeCodes : [])
      .filter(code => code.isDriving && code.vehicle && code.vehicle.registration)
      .filter(code => {
        // Filter by complex/gated
        if (complexFilter && code.complexId !== complexFilter) return false;
        if (!complexFilter && this.filtersForm.selectedGatedCommunity && code.gatedCommunityId !== this.filtersForm.selectedGatedCommunity) return false;
        return true;
      })
      .map(code => ({
        make: code.vehicle?.makeModel?.split(' ')[0] || '',
        model: code.vehicle?.makeModel?.split(' ').slice(1).join(' ') || '',
        regNumber: code.vehicle?.registration || '',
        color: code.vehicle?.color || '',
        unit: code.unit || '',
        houseNumber: code.houseNumber || '',
        owner: code.visitorName || '',
        complexId: code.complexId || '',
        gatedCommunityId: code.gatedCommunityId || '',
        isVisitor: true
      }));

    // Merge and deduplicate by regNumber
    const mappedVehicles = vehicles.map((vehicle) => ({
      ...vehicle,
      unit: this.resolveResidenceNumber(vehicle.unit, vehicle.houseNumber),
      isVisitor: false
    }));
    let all = [...mappedVehicles, ...visitorVehicles];
    const seen = new Set();
    all = all.filter(v => {
      const key = (v.regNumber || '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (unitQuery) {
      all = all.filter((vehicle) => (vehicle.unit || '').toLowerCase().includes(unitQuery));
    }
    if (regQuery) {
      all = all.filter((vehicle) => (vehicle.regNumber || '').toLowerCase().includes(regQuery));
    }
    return all;
  }

  protected getResidentInitials(name: string): string {
    return (name || 'Resident').trim().slice(0, 2).toUpperCase();
  }

  protected openResidentPhotoModal(photoUrl: string | undefined | null, residentName: string): void {
    const normalizedUrl = String(photoUrl ?? '').trim();
    this.selectedResidentPhotoUrl = normalizedUrl;
    this.selectedResidentInitials = this.getResidentInitials(residentName);
    this.isResidentPhotoModalOpen = true;
  }

  protected closeResidentPhotoModal(): void {
    this.isResidentPhotoModalOpen = false;
    this.selectedResidentPhotoUrl = '';
    this.selectedResidentInitials = '';
  }

  protected openCodeVehicleModal(code: any): void {
    if (!code?.vehicle) {
      return;
    }

    this.selectedCodeVehicle = code.vehicle;
    this.selectedCodeVisitorName = String(code.visitorName ?? '').trim();
    this.isCodeVehicleModalOpen = true;
  }

  protected closeCodeVehicleModal(): void {
    this.isCodeVehicleModalOpen = false;
    this.selectedCodeVehicle = null;
    this.selectedCodeVisitorName = '';
  }

  private resetTenantForm(): void {
    const defaultResidenceType: 'complex' | 'community' =
      this.stationType === 'gated' && this.filtersForm.selectedGatedCommunity
        ? 'community'
        : 'complex';

    const preselectedComplexId =
      this.stationType === 'complex'
        ? this.filtersForm.selectedComplex
        : '';

    const preselectedCommunityId =
      this.stationType === 'gated'
        ? this.filtersForm.selectedGatedCommunity
        : '';

    const preselectedCommunityResidenceType: 'house' | 'complex' =
      this.stationType === 'gated' && this.filtersForm.selectedComplex
        ? 'complex'
        : 'house';

    const preselectedCommunityComplexId =
      this.stationType === 'gated'
        ? this.filtersForm.selectedComplex
        : '';

    this.tenantForm = {
      id: '',
      name: '',
      surname: '',
      email: '',
      phone: '',
      idNumber: '',
      residenceType: defaultResidenceType,
      complexId: preselectedComplexId,
      communityId: preselectedCommunityId,
      communityResidenceType: preselectedCommunityResidenceType,
      communityComplexId: preselectedCommunityComplexId,
      address: '',
      vehicles: [],
    };

    this.currentVehicle = {
      make: '',
      model: '',
      reg: '',
      color: '',
    };

    this.tenantError = '';
    this.tenantSuccess = '';
  }

  private generateResidenceLabels(count: number, start: number, end: number, prefix: 'Unit' | 'House'): string[] {
    const items: string[] = [];

    if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start) {
      for (let value = start; value <= end; value++) {
        items.push(`${prefix} ${value}`);
      }
      return items;
    }

    const total = Number.isFinite(count) && count > 0 ? count : 0;
    for (let value = 1; value <= total; value++) {
      items.push(`${prefix} ${value}`);
    }

    return items;
  }

  protected get stationScopedComplexes(): Array<{ id: string; name: string; units: string[]; address?: string | null }> {
    if (this.stationType === 'complex' && this.filtersForm.selectedComplex) {
      return this.assignedComplexes.filter((item) => item.id === this.filtersForm.selectedComplex);
    }

    if (this.stationType === 'gated' && this.filtersForm.selectedGatedCommunity) {
      const community = this.gatedCommunities.find((item) => item.id === this.filtersForm.selectedGatedCommunity);
      const complexesInCommunity = new Set((community?.complexesInCommunity ?? []).map((item) => item.id));

      if (this.filtersForm.selectedComplex) {
        return this.assignedComplexes.filter((item) => item.id === this.filtersForm.selectedComplex);
      }

      return this.assignedComplexes.filter((item) => complexesInCommunity.has(item.id));
    }

    return [];
  }

  protected get stationScopedCommunities(): Array<{
    id: string;
    name: string;
    complexes: Array<{ id: string; name: string; address?: string | null }>;
    houses: string[];
    complexesInCommunity: Array<{ id: string; name: string; units: string[]; address?: string | null }>;
  }> {
    if (this.stationType === 'gated' && this.filtersForm.selectedGatedCommunity) {
      return this.gatedCommunities.filter((item) => item.id === this.filtersForm.selectedGatedCommunity);
    }

    return [];
  }

  private isAdminGuard(user: any): boolean {
    const normalize = (value: unknown): string => this.normalizeName(String(value ?? ''));

    const typeEntries = Array.isArray(user?.type) ? user.type : [user?.type];
    const normalizedTypes = typeEntries
      .map((value: unknown) => normalize(value))
      .filter((value: string) => value.length > 0);

    const hasAdminType = normalizedTypes.some((value: string) => value === 'admin' || value === 'adminguard');
    const hasGuardType = normalizedTypes.some((value: string) => value === 'security' || value === 'guard');
    if (hasAdminType && hasGuardType) {
      return true;
    }

    const directPosition = normalize(user?.position);
    if (directPosition === 'adminguard' || directPosition === 'admin' || directPosition === 'securityadmin') {
      return true;
    }

    const contracts = Array.isArray(user?.employeeContracts) ? user.employeeContracts : [];
    for (const contract of contracts) {
      const contractPosition = normalize(contract?.position);
      if (contractPosition === 'adminguard' || contractPosition === 'admin' || contractPosition === 'securityadmin') {
        return true;
      }
    }

    return false;
  }

  protected onGrantAccess(code: any): void {
    if (!code) {
      this.showToast('Access granted');
      return;
    }

    const targetVisitorId = String(code.visitorId ?? '').trim();

    code.validity = false;
    code.access = true;

    this.activeCodes = (Array.isArray(this.activeCodes) ? this.activeCodes : []).filter((item: any) => {
      if (targetVisitorId) {
        return String(item?.visitorId ?? '').trim() !== targetVisitorId;
      }
      return !(String(item?.code ?? '') === String(code.code ?? '') && String(item?.visitorName ?? '') === String(code.visitorName ?? ''));
    });

    if (Array.isArray(this.visitorList)) {
      this.visitorList = this.visitorList.map((visitor: any) => {
        const visitorId = String(visitor?._id ?? visitor?.id ?? '').trim();
        if (targetVisitorId && visitorId === targetVisitorId) {
          return { ...visitor, validity: false, access: true };
        }
        return visitor;
      });
    }

    if (targetVisitorId && this.effectiveGuardId) {
      this.dataService
        .put<any>(`visitor/grant/${this.effectiveGuardId}/false`, {
          _id: targetVisitorId,
          validity: false,
          access: true,
          expiry: code.expiryRaw ?? null,
        })
        .subscribe({
          error: () => {
            this.showToast('Access granted (local only)');
          },
        });
    }

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
    this.sendSosAlert();
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

  private sendSosAlert(): void {
    const guard = this.getCurrentUserFromStorage();
    const stationDetails = this.buildSosStationDetails();
    const payload = {
      date: new Date().toISOString(),
      guard: {
        _id: guard?._id ?? '',
        name: guard?.name ?? this.guardName,
        surname: guard?.surname ?? '',
        emailAddress: guard?.emailAddress ?? '',
        cellNumber: guard?.cellNumber ?? '',
      },
      station: stationDetails,
    };

    this.dataService.post<any>('sos', payload).subscribe({
      next: (response) => {
      },
      error: (error) => {
      },
    });
  }

  private getCurrentUserFromStorage(): any | null {
    const rawUser =
      this.storage?.getItem?.('current-user') ??
      (isPlatformBrowser(this.platformId) ? window.localStorage.getItem('current-user') : null);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }

  private buildSosStationDetails(): {
    type: 'complex' | 'gated' | 'unknown';
    name: string;
    complexId: string;
    complexName: string;
    complexAddress: string | null;
    gatedCommunityId: string;
    gatedCommunityName: string;
  } {
    const selectedComplexId = this.filtersForm.selectedComplex;
    const selectedCommunityId = this.filtersForm.selectedGatedCommunity;
    const selectedComplex = this.assignedComplexes.find((complex) => complex.id === selectedComplexId);
    const selectedCommunity = this.gatedCommunities.find((community) => community.id === selectedCommunityId);

    return {
      type: this.stationType || 'unknown',
      name: this.selectedStationName,
      complexId: selectedComplexId || '',
      complexName: selectedComplex?.name ?? '',
      complexAddress: selectedComplex?.address ?? null,
      gatedCommunityId: selectedCommunityId || '',
      gatedCommunityName: selectedCommunity?.name ?? '',
    };
  }

  protected triggerCameraInput(): void {
    this.isPhotoCameraModalOpen = true;
    console.log('DEBUG: triggerCameraInput called, isPhotoCameraModalOpen =', this.isPhotoCameraModalOpen);
    this.cdr.detectChanges();
    void this.startProfileCamera();
  }

  protected onPhotoCapture(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.guardPhotoData = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  protected async startProfileCamera(): Promise<void> {
    this.cameraError = '';
    this.guardPhotoData = '';

    try {
      // Stop any previous stream
      this.profileCameraStream?.getTracks().forEach((track) => track.stop());
      this.profileCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      // Delay stream attachment to ensure video element exists
      setTimeout(() => {
        const video = this.profileCameraVideo?.nativeElement;
        if (video) {
          video.srcObject = this.profileCameraStream;
          video.style.display = 'block';
          video.style.background = '#000';
          video.style.zIndex = '10001';
          video.play();
          console.log('DEBUG: Camera stream attached to video element');
        } else {
          this.cameraError = 'Camera video element not found.';
        }
        this.hasCameraStream = true;
      }, 200);
    } catch (error) {
      this.cameraError = 'Unable to access the camera. Please allow camera permissions.';
      this.profileCameraStream?.getTracks().forEach((track) => track.stop());
      this.profileCameraStream = null;
      this.hasCameraStream = false;
      console.error('DEBUG: Camera error', error);
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

  protected saveProfilePhoto(): void {
    if (!this.guardPhotoData || this.isSavingProfilePhoto) {
      return;
    }

    this.isSavingProfilePhoto = true;
    this.cameraError = '';

    this.dataService.put<any>('user/update', { profilePhoto: this.guardPhotoData }).subscribe({
      next: (response) => {
        const savedPhoto = response?.payload?.profilePhoto ?? this.guardPhotoData;
        this.guardPhotoUrl = savedPhoto;
        this.guardPhotoData = savedPhoto;
        this.updateCurrentUserProfilePhoto(savedPhoto);
        this.isSavingProfilePhoto = false;
        this.closeProfilePhotoModal();
      },
      error: () => {
        this.cameraError = 'Could not save profile photo right now. Please try again.';
        this.isSavingProfilePhoto = false;
      },
    });
  }

  private updateCurrentUserProfilePhoto(profilePhoto: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const rawUser =
      this.storage?.getItem?.('current-user') ??
      window.localStorage.getItem('current-user');

    if (!rawUser) {
      return;
    }

    try {
      const currentUser = JSON.parse(rawUser);
      const nextUser = {
        ...currentUser,
        profilePhoto,
      };
      this.storage.setItem('current-user', JSON.stringify(nextUser));
    } catch {
      return;
    }
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
