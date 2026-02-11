import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-security-manager-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './security-manager-login.html',
  styleUrl: './security-manager-login.css',
})
export class SecurityManagerLogin {
  protected email = '';
  protected pinDigits = Array(6).fill('');
  protected errorMessage = '';
  private readonly securityManagerEmail = 'kk@sec';
  private readonly securityManagerPin = '246800';

  constructor(private readonly router: Router) {}

  protected onDigitInput(index: number, event: Event, next?: HTMLInputElement | null): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const value = (input.value || '').replace(/\D/g, '').slice(-1);
    input.value = value;
    this.pinDigits[index] = value;
    this.errorMessage = '';

    if (value && next) {
      next.focus();
      next.select();
    }
  }

  protected onDigitKeydown(event: KeyboardEvent, prev?: HTMLInputElement | null): void {
    if (event.key !== 'Backspace') {
      return;
    }

    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    if (input.value || !prev) {
      return;
    }

    prev.focus();
    prev.select();
  }

  protected get securityPin(): string {
    return this.pinDigits.join('');
  }

  protected get isPinComplete(): boolean {
    return this.pinDigits.every((digit) => digit.length === 1);
  }

  protected markTouched(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!input) {
      return;
    }
    input.classList.add('touched');
  }

  protected async signIn(): Promise<void> {
    const normalizedEmail = this.email.trim().toLowerCase();
    const pin = this.securityPin;

    if (normalizedEmail === this.securityManagerEmail && pin === this.securityManagerPin) {
      this.errorMessage = '';
      await this.router.navigate(['/security-manager']);
      return;
    }

    this.errorMessage = 'Invalid email or PIN. Please try again.';
  }
}
