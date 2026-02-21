import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../services/data.service';
import { ResponseBody } from '../interfaces/ResponseBody';
import { StorageService } from '../services/storage.service';
import { LoginFormDTO } from '../interfaces/forms/loginFormDTO';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly stationStorageKey = 'equasec.guard.station';
  protected loginForm: LoginFormDTO = {
    email: '',
    pinDigits: Array.from({ length: 6 }, () => '')
  };
  protected get email(): string {
    return this.loginForm.email;
  }

  protected set email(value: string) {
    this.loginForm.email = value;
  }

  protected get pinDigits(): string[] {
    return this.loginForm.pinDigits;
  }

  protected set pinDigits(value: string[]) {
    this.loginForm.pinDigits = value;
  }

  constructor(
    private readonly router: Router,
    private service: DataService,
    private storage: StorageService,
  ) {}

  protected onPinInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    input.classList.add('touched');
    const digit = (input.value || '').replace(/\D/g, '').slice(0, 1);
    input.value = digit;
    this.loginForm.pinDigits[index] = digit;
    if (digit && input.nextElementSibling instanceof HTMLInputElement) {
      input.nextElementSibling.focus();
    }
  }

  protected onPinKeydown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    if (event.key === 'Backspace' && !input.value) {
      const prev = input.previousElementSibling;
      if (prev instanceof HTMLInputElement) {
        prev.focus();
      }
    }
  }

  protected markTouched(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!input) {
      return;
    }
    input.classList.add('touched');
  }

  protected getPinValue(): string {
    return this.loginForm.pinDigits.join('');
  }

  protected isFormValid(): boolean {
    const pin = this.getPinValue();
    return this.loginForm.email.trim().length > 0 && pin.length === 6;
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

  private storeStationFromActiveShift(activeShift: unknown): void {
    const station = (activeShift as { station?: { type?: unknown; gatedCommunityId?: unknown; complexId?: unknown } } | null)?.station;
    const stationType = String(station?.type ?? '');

    if (stationType !== 'gated' && stationType !== 'complex') {
      this.storage.removeItem(this.stationStorageKey);
      return;
    }

    const selectedGatedCommunity = this.normalizeStationId(station?.gatedCommunityId);
    const selectedComplex = this.normalizeStationId(station?.complexId);

    if (stationType === 'gated' && !selectedGatedCommunity) {
      this.storage.removeItem(this.stationStorageKey);
      return;
    }

    if (stationType === 'complex' && !selectedComplex) {
      this.storage.removeItem(this.stationStorageKey);
      return;
    }

    this.storage.setItem(
      this.stationStorageKey,
      JSON.stringify({
        stationType,
        selectedGatedCommunity,
        selectedComplex,
      })
    );
  }

  submitForm() {
    this.service
      .post<ResponseBody>('user/login', { emailAddress: this.loginForm.email, password: this.getPinValue().replaceAll(',', '') })
      .subscribe({
        next: (res) => {
          this.storage.setItem("bearer-token", res.payload.token);
          if (res?.payload?.user) {
            this.storage.setItem("current-user", JSON.stringify(res.payload.user));
          }
          const userType = res?.payload?.type;
          const hasRole = (role: string): boolean => {
            const normalizedRole = role.toLowerCase();
            if (Array.isArray(userType)) {
              return userType.some((value) => String(value).toLowerCase() === normalizedRole);
            }

            if (typeof userType === 'string') {
              return userType.toLowerCase().includes(normalizedRole);
            }

            return false;
          };

          const isManager = hasRole('manager');
          const isAdmin = hasRole('admin');
          const isSecurity = hasRole('security');
          const isGuard = hasRole('guard');
          const isTenant = hasRole('tenant');
          const isAdminOnly = isAdmin && !isManager && !isSecurity && !isGuard && !isTenant;

          if (isManager) {
            this.router.navigate(['/security-manager']);
            return;
          }

          if (isAdminOnly) {
            this.router.navigate(['/admin-portal']);
            return;
          }

          if (isGuard || isSecurity) {
            this.service.get<{ payload?: unknown }>('guardHistory/active').subscribe({
              next: (activeShiftResponse) => {
                this.storeStationFromActiveShift(activeShiftResponse?.payload ?? null);
                this.router.navigate(['/guard-portal']);
              },
              error: () => {
                this.storage.removeItem(this.stationStorageKey);
                this.router.navigate(['/guard-portal']);
              },
            });
            return;
          }

          if (isTenant) {
            this.router.navigate(['/dashboard']);
            return;
          }
        },
        error: (err) => {
          console.error(err);
        },
      });
  }
}
