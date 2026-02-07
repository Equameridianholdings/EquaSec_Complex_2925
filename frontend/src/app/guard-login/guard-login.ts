import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-guard-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './guard-login.html',
  styleUrl: './guard-login.css',
})
export class GuardLogin {
  protected email = '';
  protected codeDigits = Array(6).fill('');
  protected errorMessage = '';
  private readonly adminEmail = 'kkpartners@equameridianholdings.com';
  private readonly adminPin = '654321';

  constructor(private readonly router: Router) {}

  protected onDigitInput(index: number, event: Event, next?: HTMLInputElement | null): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const value = (input.value || '').replace(/\D/g, '').slice(-1);
    input.value = value;
    this.codeDigits[index] = value;
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

  protected get guardCode(): string {
    return this.codeDigits.join('');
  }

  protected get isCodeComplete(): boolean {
    return this.codeDigits.every((digit) => digit.length === 1);
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
    const code = this.guardCode;

    // Check if admin
    if (normalizedEmail === this.adminEmail && code === this.adminPin) {
      this.errorMessage = '';
      await this.router.navigate(['/admin-portal']);
      return;
    }

    // Regular guard access
    if (code === '123456') {
      this.errorMessage = '';
      await this.router.navigate(['/guard-portal']);
      return;
    }

    this.errorMessage = 'Invalid email or access code. Please try again.';
  }
}
