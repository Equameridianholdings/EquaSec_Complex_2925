import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../services/data.service';
import { loginDTO } from '../interfaces/userDTO';
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

  submitForm(email: string, pin: string) {
    this.service
      .post<ResponseBody>('user/login', { emailAddress: this.loginForm.email, password: this.getPinValue().replaceAll(',', '') })
      .subscribe({
        next: (res) => {
          this.storage.setItem("bearer-token", res.payload.token);
          switch (res.payload.type.includes('admin')) {
            case res.payload.type.includes('admin'):
              this.router.navigate(['/admin-portal']);
              break;

            case res.payload.type.includes('manager'):
              this.router.navigate(['/security-manager']);
              break;

            case res.payload.type.includes('security'):
              this.router.navigate(['/gaurd-portal']);
              break;

            case res.payload.type.includes('tenant'):
              this.router.navigate(['/dashboard']);
              break;

            default:
              break;
          }
        },
        error: (err) => {
          console.error(err);
        },
      });
  }
}
