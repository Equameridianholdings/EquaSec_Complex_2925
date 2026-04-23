import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DataService } from '../services/data.service';
import { StorageService } from '../services/storage.service';
import { TenantFormDTO } from '../interfaces/forms/tenantFormDTO';
import { VehicleFormDTO } from '../interfaces/forms/vehicleFormDTO';
import { ResponseBody } from '../interfaces/ResponseBody';
import { Loader } from '../components/loader/loader';

@Component({
  selector: 'app-register-tenant',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './register-tenant.html',
  styleUrl: './register-tenant.css',
})
export class RegisterTenant implements OnInit {
  private _snackBar = inject(MatSnackBar);
  private horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  private verticalPosition: MatSnackBarVerticalPosition = 'top';

  protected tenantForm: TenantFormDTO = {
    id: '',
    name: '',
    surname: '',
    email: '',
    phone: '',
    idNumber: '',
    address: '',
    residenceType: 'complex',
    complexId: '',
    communityId: '',
    communityResidenceType: '',
    communityComplexId: '',
    vehicles: [],
  };

  protected currentVehicle: VehicleFormDTO = {
    make: '',
    model: '',
    reg: '',
    color: '',
  };

  protected tenantHasCar: boolean | null = null;
  protected tenantAnotherVehicle: boolean | null = null;
  protected editingVehicleIndex: number | null = null;
  protected tenantSubmitting = false;
  protected tenantError = '';
  protected tenantSuccess = '';
  protected isUpdateMode = false;
  protected isTenantConfirmModalOpen = false;

  protected assignedComplexes: any[] = [];
  protected assignedCommunities: any[] = [];
  protected stationScopedComplexes: any[] = [];
  protected stationScopedCommunities: any[] = [];
  protected availableUnits: string[] = [];
  protected availableHouses: string[] = [];
  protected availableCommunityComplexes: any[] = [];
  protected availableCommunityUnits: string[] = [];
  protected availableTenantResidenceTypes: Array<{ value: string; label: string }> = [];
  protected availableCommunityResidenceTypes: string[] = [];
  protected currentUser: any = null;
  protected currentStationId = '';
  protected stationType = '';
  protected residents: any[] = [];

  // Registration token properties
  protected registrationToken: string | null = null;
  protected isTokenRegistration = false;
  protected tokenData: any = null;

  constructor(
    private dataService: DataService,
    private storageService: StorageService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check for token first, then load user data conditionally
    this.route.queryParams.subscribe((params) => {
      if (params['token']) {
        this.registrationToken = params['token'];
        this.isTokenRegistration = true;
        this.validateRegistrationToken(params['token']);
      } else {
        // Only load user data if not a token registration
        this.loadUserData();
      }
      
      // Check for update mode
      if (params['id'] && !this.isTokenRegistration) {
        this.isUpdateMode = true;
        this.tenantForm.id = params['id'];
        this.loadTenantDetails(params['id']);
      }
    });
  }

  private validateRegistrationToken(token: string): void {
    this.dataService.get<ResponseBody>(`user/validate-registration-token/${token}`).subscribe({
      next: (response) => {
        if (response.payload) {
          this.tokenData = response.payload;
          this.prefillFormFromToken(response.payload);
        }
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = error?.error?.message ?? 'Invalid or expired registration link.';
        this._snackBar.open(errorMessage, 'close', {
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.tenantError = errorMessage;
        // Redirect to home after showing error
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 3000);
      },
    });
  }

  private prefillFormFromToken(tokenData: any): void {
    this.tenantForm.email = tokenData.emailAddress || '';
    this.tenantForm.address = tokenData.address || '';
    this.tenantForm.residenceType = tokenData.residenceType || 'complex';
    
    if (tokenData.residenceType === 'complex') {
      this.tenantForm.complexId = tokenData.complexId || '';
      // Load complex data to populate unit dropdown
      this.loadComplexDataForToken(tokenData.complexId);
    } else {
      this.tenantForm.communityId = tokenData.communityId || '';
      this.tenantForm.communityResidenceType = tokenData.communityResidenceType || 'house';
      this.tenantForm.communityComplexId = tokenData.communityComplexId || '';
      // Load community data
      this.loadCommunityDataForToken(tokenData.communityId, tokenData.communityResidenceType, tokenData.communityComplexId);
    }

    // Set available residence types for display
    if (tokenData.residenceType === 'complex') {
      this.availableTenantResidenceTypes = [{ value: 'complex', label: 'Complex/Building' }];
    } else {
      this.availableTenantResidenceTypes = [{ value: 'community', label: 'Gated Community' }];
    }
  }

  private loadUserData(): void {
    // Skip loading user data if this is a token-based registration
    if (this.isTokenRegistration) {
      return;
    }

    // Load current user from API to get full user object with complexId and gatedCommunityId
    this.dataService.get<ResponseBody>('user/current').subscribe({
      next: (response) => {
        const user = response?.payload ?? response ?? null;
        if (user && typeof user === 'object') {
          this.currentUser = user;
          this.loadAssignedSites();
          this.loadCurrentStation();
        } else {
          console.error('❌ [RegisterTenant] No user data received from API');
          this._snackBar.open('Unable to load user data', 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
        }
      },
      error: (error) => {
        console.error('❌ [RegisterTenant] Error loading user from API:', error);
        this._snackBar.open('Error loading user data', 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
      },
    });
  }

  private loadComplexDataForToken(complexId: string): void {
    if (!complexId) return;

    // Load complex details and units
    forkJoin({
      complexes: this.dataService.get<ResponseBody>('complex/').pipe(catchError(() => of({ payload: [] } as ResponseBody))),
      units: this.dataService.get<any[]>('unit/').pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ complexes, units }) => {
        const allComplexes = complexes.payload || [];
        const allUnits = Array.isArray(units) ? units : [];
        
        const complex = allComplexes.find((c: any) => (c._id || c.id) === complexId);
        if (complex) {
          // Map complex with units
          const complexUnits = allUnits
            .filter((unit: any) => {
              const unitComplexId = unit.complex?._id || unit.complex?.id || unit.complex;
              return String(unitComplexId) === String(complexId);
            })
            .map((unit: any) => unit.number || unit.unitNumber)
            .filter(Boolean);

          this.stationScopedComplexes = [{
            _id: complex._id || complex.id,
            id: complex._id || complex.id,
            name: complex.name,
            units: complexUnits,
            address: complex.address,
            gatedCommunityName: complex.gatedCommunityName || '',
          }];

          this.availableUnits = complexUnits;
        }
      },
      error: (error) => {
        console.error('Error loading complex data for token:', error);
      }
    });
  }

  private loadCommunityDataForToken(communityId: string, communityResidenceType: string, communityComplexId?: string): void {
    if (!communityId) return;

    // Load community details
    forkJoin({
      communities: this.dataService.get<ResponseBody>('gatedCommunity/').pipe(catchError(() => of({ payload: [] } as ResponseBody))),
      complexes: this.dataService.get<ResponseBody>('complex/').pipe(catchError(() => of({ payload: [] } as ResponseBody))),
      units: this.dataService.get<any[]>('unit/').pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ communities, complexes, units }) => {
        const allCommunities = communities.payload || [];
        const allComplexes = complexes.payload || [];
        const allUnits = Array.isArray(units) ? units : [];

        const community = allCommunities.find((c: any) => (c._id || c.id) === communityId);
        if (community) {
          // Find complexes in this community
          const communityComplexes = allComplexes
            .filter((c: any) => {
              const complexCommunityName = String(c.gatedCommunityName || '').trim().toLowerCase();
              const communityName = String(community.name || '').trim().toLowerCase();
              return complexCommunityName === communityName;
            })
            .map((c: any) => ({
              id: c._id || c.id,
              _id: c._id || c.id,
              name: c.name,
            }));

          this.stationScopedCommunities = [{
            _id: community._id || community.id,
            id: community._id || community.id,
            name: community.name,
            houseCount: community.numberOfHouses || 0,
            complexes: communityComplexes,
          }];

          // Set available residence types
          const hasHouses = (community.numberOfHouses || 0) > 0;
          const hasComplexes = communityComplexes.length > 0;
          this.availableCommunityResidenceTypes = [];
          if (hasHouses) this.availableCommunityResidenceTypes.push('house');
          if (hasComplexes) this.availableCommunityResidenceTypes.push('complex');

          // Load houses or complex units based on type
          if (communityResidenceType === 'house') {
            const houseNumbers: string[] = [];
            for (let i = 1; i <= (community.numberOfHouses || 0); i++) {
              houseNumbers.push(`House ${i}`);
            }
            this.availableHouses = houseNumbers;
          } else if (communityResidenceType === 'complex' && communityComplexId) {
            // Load units for the specific complex
            const complexUnits = allUnits
              .filter((unit: any) => {
                const unitComplexId = unit.complex?._id || unit.complex?.id || unit.complex;
                return String(unitComplexId) === String(communityComplexId);
              })
              .map((unit: any) => unit.number || unit.unitNumber)
              .filter(Boolean);

            this.availableCommunityComplexes = communityComplexes;
            this.availableCommunityUnits = complexUnits;

            // Also populate stationScopedComplexes for the complex within community
            const selectedComplex = allComplexes.find((c: any) => (c._id || c.id) === communityComplexId);
            if (selectedComplex) {
              this.stationScopedComplexes = [{
                _id: selectedComplex._id || selectedComplex.id,
                id: selectedComplex._id || selectedComplex.id,
                name: selectedComplex.name,
                units: complexUnits,
                address: selectedComplex.address,
                gatedCommunityName: selectedComplex.gatedCommunityName || '',
              }];
            }
          }
        }
      },
      error: (error) => {
        console.error('Error loading community data for token:', error);
      }
    });
  }

  private loadTenantDetails(tenantId: string): void {
    this.dataService.get<ResponseBody>(`user/tenant/${tenantId}`).subscribe({
      next: (response) => {
        const resident = response.payload;
        if (resident) {
          this.populateTenantForm(resident);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.tenantError = 'Unable to load tenant details.';
        this._snackBar.open(this.tenantError, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
      },
    });
  }

  private populateTenantForm(resident: any): void {
    const hasGatedCommunityId = !!resident.gatedCommunityId;
    const hasComplexOnly = !!resident.complexId && !hasGatedCommunityId;
    const isGatedComplexResident =
      hasComplexOnly && this.stationType === 'gated' && !!resident.complexId;

    const isCommunity = hasGatedCommunityId || isGatedComplexResident;
    const residenceType: 'complex' | 'community' = isCommunity ? 'community' : 'complex';

    this.tenantForm = {
      id: resident._id,
      name: resident.name || '',
      surname: resident.surname || '',
      email: resident.emailAddress || '',
      phone: resident.cellNumber || '',
      idNumber: resident.idNumber || '',
      address: resident.address || '',
      residenceType: residenceType,
      complexId: !isCommunity ? (resident.complexId || '') : '',
      communityId: hasGatedCommunityId ? (resident.gatedCommunityId || '') : (resident.complexId || ''),
      communityResidenceType: isCommunity ? (resident.complexId ? 'complex' as const : 'house' as const) : '',
      communityComplexId: isCommunity && resident.complexId ? resident.complexId : '',
      vehicles: resident.vehicles || [],
    };

    this.tenantHasCar = (resident.vehicles?.length || 0) > 0;
    if (this.tenantHasCar) {
      this.tenantAnotherVehicle = false;
    }

    this.onResidenceTypeChange();
  }

  private loadAssignedSites(): void {
    if (!this.currentUser) {
      return;
    }

    // Collect IDs from various possible user properties
    const directComplexIds = this.collectAssignedIds('complex');
    const communityIds = this.collectAssignedIds('community');

    const communityCall$ = communityIds.length > 0
      ? this.dataService.get<ResponseBody>('gatedCommunity/').pipe(
          catchError(() => of({ payload: [] } as ResponseBody))
        )
      : of({ payload: [] } as ResponseBody);

    const unitCall$ = this.dataService.get<any[]>('unit/').pipe(
      catchError(() => of([]))
    );

    // First load communities to extract their complex IDs
    communityCall$.subscribe({
      next: (communityResponse) => {
        const allCommunities = communityResponse.payload || [];
        
        // Extract complex IDs from communities
        const communityComplexIds = new Set<string>();
        allCommunities
          .filter((gc: any) => communityIds.includes(gc._id || gc.id))
          .forEach((community: any) => {
            (community.complexes || []).forEach((c: any) => {
              const complexId = c._id || c.id;
              if (complexId) {
                communityComplexIds.add(complexId);
              }
            });
          });

        // Combine direct complex IDs with complex IDs from communities
        const allComplexIds = [...new Set([...directComplexIds, ...Array.from(communityComplexIds)])];

        // Now load complexes with the complete ID list
        const complexCall$ = allComplexIds.length > 0
          ? this.dataService.get<ResponseBody>('complex/').pipe(
              catchError(() => of({ payload: [] } as ResponseBody))
            )
          : of({ payload: [] } as ResponseBody);

        forkJoin([complexCall$, unitCall$]).subscribe({
          next: ([complexResponse, unitResponse]) => {
            const allComplexes = complexResponse.payload || [];
            const allUnits = Array.isArray(unitResponse) ? unitResponse : [];

            // Map complexes with their units
            this.assignedComplexes = allComplexes
              .filter((c: any) => allComplexIds.includes(c._id || c.id))
              .map((complex: any) => {
                const complexId = complex._id || complex.id;
                
                const units = allUnits
                  .filter((unit: any) => {
                    const unitComplexId = unit.complex?._id || unit.complex?.id || unit.complex;
                    return String(unitComplexId) === String(complexId);
                  })
                  .map((unit: any) => unit.number || unit.unitNumber)
                  .filter(Boolean);

                return {
                  _id: complexId,
                  id: complexId,
                  name: complex.name,
                  units: units,
                  address: complex.address,
                  gatedCommunityName: complex.gatedCommunityName || '',
                };
              });

            // Map gated communities with their complexes and houses
            this.assignedCommunities = allCommunities
              .filter((gc: any) => communityIds.includes(gc._id || gc.id))
              .map((community: any) => {
                const communityId = community._id || community.id;
                
                // Find complexes that belong to this community by matching gatedCommunityName
                const communityComplexes = this.assignedComplexes
                  .filter((c: any) => {
                    const complexGatedName = String(c.gatedCommunityName || '').trim().toLowerCase();
                    const communityName = String(community.name || '').trim().toLowerCase();
                    return complexGatedName === communityName;
                  })
                  .map((c: any) => ({
                    id: c._id || c.id,
                    name: c.name,
                    _id: c._id || c.id,
                  }));

                return {
                  _id: communityId,
                  id: communityId,
                  name: community.name,
                  houseCount: community.numberOfHouses || 0,
                  complexes: communityComplexes,
                };
              });

            // Now that data is loaded, update station scoped sites
            this.updateStationScopedSites();
          },
          error: (error) => {
            console.error('Error loading complexes and units:', error);
            this._snackBar.open('Error loading site data', 'close', {
              horizontalPosition: this.horizontalPosition,
              verticalPosition: this.verticalPosition,
            });
          },
        });
      },
      error: (error) => {
        console.error('Error loading communities:', error);
        this._snackBar.open('Error loading community data', 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
      },
    });
  }

  private collectAssignedIds(kind: 'complex' | 'community'): string[] {
    if (!this.currentUser || typeof this.currentUser !== 'object') {
      return [];
    }

    const idSet = new Set<string>();
    const directKey = kind === 'complex' ? 'assignedComplexes' : 'assignedCommunities';
    const legacyKey = kind === 'complex' ? 'complexId' : 'gatedCommunityId';

    // Check direct array property (assignedComplexes / assignedCommunities)
    const directValues = this.currentUser[directKey];
    if (Array.isArray(directValues)) {
      for (const value of directValues) {
        const normalized = String(value ?? '').trim();
        if (normalized) {
          idSet.add(normalized);
        }
      }
    }

    // Check legacy array property (complexId / gatedCommunityId)
    const legacyValues = this.currentUser[legacyKey];
    if (Array.isArray(legacyValues)) {
      for (const value of legacyValues) {
        const normalized = String(value ?? '').trim();
        if (normalized) {
          idSet.add(normalized);
        }
      }
    }

    // Check employeeContracts
    const contracts = Array.isArray(this.currentUser.employeeContracts)
      ? this.currentUser.employeeContracts
      : [];
    for (const contract of contracts) {
      const contractValues = contract?.[directKey];
      if (!Array.isArray(contractValues)) {
        continue;
      }

      for (const value of contractValues) {
        const normalized = String(value ?? '').trim();
        if (normalized) {
          idSet.add(normalized);
        }
      }
    }

    return Array.from(idSet);
  }

  private loadCurrentStation(): void {
    const stationData = this.storageService.getItem('equasec.guard.station');
    if (stationData) {
      const station = JSON.parse(stationData);
      // The stored station has different property names
      this.stationType = station.stationType; // not "type"
      
      // Station ID depends on type
      if (this.stationType === 'complex') {
        this.currentStationId = station.selectedComplex;
      } else if (this.stationType === 'gated') {
        this.currentStationId = station.selectedGatedCommunity;
      }
    }
  }

  private updateStationScopedSites(): void {
    if (!this.currentStationId || !this.stationType) {
      this.stationScopedComplexes = [];
      this.stationScopedCommunities = [];
      this.tenantError = 'Please select a station from the Guard Portal before registering a tenant.';
      this.updateAvailableTenantResidenceTypes();
      return;
    }

    if (this.stationType === 'complex') {
      this.stationScopedComplexes = this.assignedComplexes.filter(
        (c) => c._id === this.currentStationId || c.id === this.currentStationId
      );
      this.stationScopedCommunities = [];
    } else if (this.stationType === 'gated') {
      this.stationScopedCommunities = this.assignedCommunities.filter(
        (gc) => gc._id === this.currentStationId || gc.id === this.currentStationId
      );
      
      const currentCommunity = this.stationScopedCommunities[0];
      if (currentCommunity) {
        // Map community complexes to full complex objects with units
        const communityComplexIds = (currentCommunity.complexes || []).map((c: any) => c._id || c.id);
        
        this.stationScopedComplexes = this.assignedComplexes.filter((complex) =>
          communityComplexIds.includes(complex._id || complex.id)
        );
      } else {
        this.stationScopedComplexes = [];
      }
    }

    this.updateAvailableTenantResidenceTypes();
    
    // Auto-populate form fields based on station
    this.prePopulateFormFromStation();
  }

  private updateAvailableTenantResidenceTypes(): void {
    const types: Array<{ value: string; label: string }> = [];
    if (this.stationScopedComplexes.length > 0) {
      types.push({ value: 'complex', label: 'Complex/Building' });
    }
    if (this.stationScopedCommunities.length > 0) {
      types.push({ value: 'community', label: 'Gated Community' });
    }
    this.availableTenantResidenceTypes = types;
  }

  private prePopulateFormFromStation(): void {
    if (!this.currentStationId || !this.stationType) {
      return;
    }

    // Set residence type based on station type
    if (this.stationType === 'complex') {
      this.tenantForm.residenceType = 'complex';
      this.tenantForm.complexId = this.currentStationId;
      // Load units for the selected complex
      this.onComplexChange();
    } else if (this.stationType === 'gated') {
      this.tenantForm.residenceType = 'community';
      this.tenantForm.communityId = this.currentStationId;
      // Load houses/complexes for the selected community
      this.onCommunityChange();
    }
  }

  protected onResidenceTypeChange(): void {
    this.tenantForm.complexId = '';
    this.tenantForm.communityId = '';
    this.tenantForm.communityResidenceType = '';
    this.tenantForm.communityComplexId = '';
    this.tenantForm.address = '';
    this.availableUnits = [];
    this.availableHouses = [];
    this.availableCommunityComplexes = [];
    this.availableCommunityUnits = [];
  }

  protected onComplexChange(): void {
    this.tenantForm.address = '';
    this.availableUnits = [];

    if (this.tenantForm.complexId) {
      const selectedComplex = this.stationScopedComplexes.find(
        (c) => c._id === this.tenantForm.complexId || c.id === this.tenantForm.complexId
      );
      if (selectedComplex && selectedComplex.units) {
        this.availableUnits = [...selectedComplex.units].filter(Boolean);
      }
    }
  }

  protected onCommunityChange(): void {
    this.tenantForm.communityResidenceType = '';
    this.tenantForm.communityComplexId = '';
    this.tenantForm.address = '';
    this.availableHouses = [];
    this.availableCommunityComplexes = [];
    this.availableCommunityUnits = [];
    this.availableCommunityResidenceTypes = [];

    if (this.tenantForm.communityId) {
      const selectedCommunity = this.stationScopedCommunities.find(
        (gc) => gc._id === this.tenantForm.communityId || gc.id === this.tenantForm.communityId
      );
      
      if (selectedCommunity) {
        const hasHouses = selectedCommunity.houseCount > 0;
        const hasComplexes = selectedCommunity.complexes?.length > 0;

        if (hasHouses) {
          this.availableCommunityResidenceTypes.push('house');
          const houseNumbers: string[] = [];
          for (let i = 1; i <= selectedCommunity.houseCount; i++) {
            houseNumbers.push(`House ${i}`);
          }
          this.availableHouses = houseNumbers;
        }

        if (hasComplexes) {
          this.availableCommunityResidenceTypes.push('complex');
          this.availableCommunityComplexes = selectedCommunity.complexes.map((c: any) => ({
            id: c._id || c.id,
            name: c.name,
          }));
        }

        if (this.availableCommunityResidenceTypes.length === 1) {
          this.tenantForm.communityResidenceType = this.availableCommunityResidenceTypes[0] as 'house' | 'complex';
        }
      }
    }
  }

  protected onCommunityResidenceTypeChange(): void {
    this.tenantForm.address = '';
    this.tenantForm.communityComplexId = '';
    this.availableCommunityUnits = [];
  }

  protected onCommunityComplexChange(): void {
    this.tenantForm.address = '';
    this.availableCommunityUnits = [];

    if (this.tenantForm.communityComplexId) {
      // Find the complex in the assignedComplexes (which has units loaded)
      const selectedComplex = this.assignedComplexes.find(
        (c) => (c._id || c.id) === this.tenantForm.communityComplexId
      );
      
      if (selectedComplex && selectedComplex.units) {
        this.availableCommunityUnits = [...selectedComplex.units].filter(Boolean);
      }
    }
  }

  protected addVehicle(): void {
    if (!this.currentVehicle.make || !this.currentVehicle.model || !this.currentVehicle.reg) {
      this.tenantError = 'Please fill in vehicle make, model, and registration number.';
      return;
    }

    const isDuplicate = this.tenantForm.vehicles.some(
      (vehicle, idx) =>
        vehicle.reg.toLowerCase() === this.currentVehicle.reg.trim().toLowerCase() &&
        idx !== this.editingVehicleIndex
    );

    if (isDuplicate) {
      this.tenantError = 'A vehicle with this registration number is already added.';
      return;
    }

    const vehicleData = {
      make: this.currentVehicle.make.trim(),
      model: this.currentVehicle.model.trim(),
      reg: this.currentVehicle.reg.trim(),
      color: this.currentVehicle.color.trim(),
    };

    if (this.editingVehicleIndex !== null) {
      const updated = [...this.tenantForm.vehicles];
      updated[this.editingVehicleIndex] = vehicleData;
      this.tenantForm = { ...this.tenantForm, vehicles: updated };
      this.editingVehicleIndex = null;
    } else {
      this.tenantForm = { ...this.tenantForm, vehicles: [...this.tenantForm.vehicles, vehicleData] };
    }

    this.currentVehicle = { make: '', model: '', reg: '', color: '' };
    this.tenantAnotherVehicle = null;
    this.tenantError = '';
  }

  protected editVehicle(index: number): void {
    this.editingVehicleIndex = index;
    this.currentVehicle = { ...this.tenantForm.vehicles[index] };
    this.tenantAnotherVehicle = true;
  }

  protected removeVehicle(index: number): void {
    const updated = this.tenantForm.vehicles.filter((_, i) => i !== index);
    this.tenantForm = { ...this.tenantForm, vehicles: updated };

    if (updated.length === 0) {
      this.tenantHasCar = null;
      this.tenantAnotherVehicle = null;
    }
  }

  protected get confirmationRows(): Array<{ label: string; value: string }> {
    const f = this.tenantForm;
    let rows: Array<{ label: string; value: string }> = [
      { label: 'Name', value: `${f.name} ${f.surname}` },
      { label: 'Email', value: f.email },
      { label: 'Phone', value: f.phone },
    ];

    if (f.idNumber) {
      rows.push({ label: 'ID Number', value: f.idNumber });
    }

    if (f.residenceType === 'complex') {
      const complex = this.stationScopedComplexes.find((c) => c._id === f.complexId || c.id === f.complexId);
      rows.push({ label: 'Complex', value: complex?.name || 'N/A' });
      rows.push({ label: 'Unit', value: f.address });
    } else if (f.residenceType === 'community') {
      const community = this.stationScopedCommunities.find(
        (gc) => gc._id === f.communityId || gc.id === f.communityId
      );
      rows.push({ label: 'Community', value: community?.name || 'N/A' });

      if (f.communityResidenceType === 'house') {
        rows.push({ label: 'House', value: f.address });
      } else if (f.communityResidenceType === 'complex') {
        const complex = this.availableCommunityComplexes.find((c) => c.id === f.communityComplexId);
        rows.push({ label: 'Complex', value: complex?.name || 'N/A' });
        rows.push({ label: 'Unit', value: f.address });
      }
    }

    if (f.vehicles.length > 0) {
      f.vehicles.forEach((v, i) => {
        const label = f.vehicles.length > 1 ? `Vehicle ${i + 1}` : 'Vehicle';
        rows.push({
          label: label,
          value: `${v.make} ${v.model} — ${v.reg}${v.color ? ` (${v.color})` : ''}`,
        });
      });
    } else {
      rows.push({ label: 'Vehicle', value: 'None' });
    }

    return rows;
  }

  protected openConfirmTenantModal(): void {
    this.isTenantConfirmModalOpen = true;
  }

  protected closeConfirmTenantModal(): void {
    this.isTenantConfirmModalOpen = false;
  }

  protected confirmAndSubmitTenant(): void {
    this.isTenantConfirmModalOpen = false;
    this.submitTenantForm();
  }

  protected get isTenantFormReady(): boolean {
    const f = this.tenantForm;
    if (!f.name?.trim() || !f.surname?.trim() || !f.email?.trim()) return false;
    if (!f.phone?.trim() || !/^0\d{9}$/.test(f.phone.trim())) return false;
    if (this.tenantHasCar === null) return false;
    if (this.tenantHasCar === true && f.vehicles.length === 0) return false;
    if (this.tenantHasCar === true && f.vehicles.length > 0 && this.tenantAnotherVehicle !== false)
      return false;
    if (f.residenceType === 'complex') {
      return !!f.complexId && !!f.address;
    }
    if (f.residenceType === 'community') {
      if (!f.communityId) return false;
      if (!f.communityResidenceType) return false;
      if (f.communityResidenceType === 'house') return !!f.address;
      if (f.communityResidenceType === 'complex') return !!f.communityComplexId && !!f.address;
    }
    return !!f.address;
  }

  protected submitTenantForm(): void {
    if (this.tenantSubmitting) return;

    this.tenantSubmitting = true;
    this.tenantError = '';
    this.tenantSuccess = this.isUpdateMode ? 'Updating tenant...' : 'Registering tenant...';

    if (
      !this.tenantForm.name ||
      !this.tenantForm.surname ||
      !this.tenantForm.email ||
      !this.tenantForm.phone ||
      !this.tenantForm.address
    ) {
      this.tenantError = 'Please fill in all required fields.';
      this.tenantSuccess = '';
      this.tenantSubmitting = false;
      return;
    }

    this.tenantForm.phone = this.tenantForm.phone.trim();

    if (!/^0\d{9}$/.test(this.tenantForm.phone)) {
      this.tenantError = 'Phone number must be 10 digits and start with 0.';
      this.tenantSuccess = '';
      this.tenantSubmitting = false;
      return;
    }

    const selectedComplexForTenant =
      this.tenantForm.residenceType === 'complex'
        ? this.assignedComplexes.find((complex) => complex._id === this.tenantForm.complexId || complex.id === this.tenantForm.complexId)
        : this.availableCommunityComplexes.find((complex) => complex.id === this.tenantForm.communityComplexId);

    const payload: any = {
      name: this.tenantForm.name.trim(),
      surname: this.tenantForm.surname.trim(),
      emailAddress: this.tenantForm.email.trim().toLowerCase(),
      cellNumber: this.tenantForm.phone.trim(),
      idNumber: this.tenantForm.idNumber?.trim() || undefined,
      address: this.tenantForm.address.trim(),
      residenceType: this.tenantForm.residenceType,
      complexId:
        this.tenantForm.residenceType === 'complex'
          ? this.tenantForm.complexId
          : this.tenantForm.communityComplexId,
      complexName: selectedComplexForTenant?.name ?? '',
      communityId: this.tenantForm.communityId,
      communityResidenceType: this.tenantForm.communityResidenceType,
      communityComplexId: this.tenantForm.communityComplexId,
      vehicles: this.tenantForm.vehicles,
    };

    // Add registration token if present
    if (this.isTokenRegistration && this.registrationToken) {
      payload.registrationToken = this.registrationToken;
    }

    if (this.isUpdateMode) {
      const tenantId = this.tenantForm.id;
      if (!tenantId) {
        this.tenantError = 'Tenant ID is missing. Please try again.';
        this.tenantSubmitting = false;
        return;
      }
      this.dataService.put<ResponseBody>(`user/tenant/${tenantId}`, payload).subscribe({
        next: (response) => {
          this._snackBar.open(response.message ?? 'Tenant updated successfully!', 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.tenantSuccess = response.message ?? 'Tenant updated successfully!';
          setTimeout(() => {
            this.router.navigate(['/guard-portal']);
          }, 1500);
        },
        error: (error: HttpErrorResponse) => {
          this.tenantSuccess = '';
          this.tenantError = error?.error?.message ?? 'Unable to update tenant.';
          this._snackBar.open(this.tenantError, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.tenantSubmitting = false;
        },
      });
    } else {
      // Use different endpoint for token-based registration
      const endpoint = this.isTokenRegistration ? 'user/register' : 'user/tenant';
      
      this.dataService.post<ResponseBody>(endpoint, payload).subscribe({
        next: (response) => {
          const emailSent = response?.payload?.emailSent !== false;
          const successMessage = this.isTokenRegistration
            ? 'Registration successful! You can now log in.'
            : emailSent
              ? `${response.message} Login credentials were sent by email.`
              : `${response.message} Tenant created, but credentials email was not confirmed.`;

          this._snackBar.open(successMessage, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.tenantSuccess = successMessage;

          setTimeout(() => {
            this.router.navigate(this.isTokenRegistration ? ['/login'] : ['/guard-portal']);
          }, 1500);
        },
        error: (error: HttpErrorResponse) => {
          this.tenantSuccess = '';
          this.tenantError = error?.error?.message ?? 'Unable to register tenant.';
          this._snackBar.open(this.tenantError, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.tenantSubmitting = false;
        },
      });
    }
  }

  protected cancel(): void {
    this.router.navigate(['/guard-portal']);
  }
}
