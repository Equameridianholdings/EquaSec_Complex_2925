import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  constructor(private readonly router: Router) {}
  protected onPinInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    input.classList.add('touched');
    const digit = (input.value || '').replace(/\D/g, '').slice(0, 1);
    input.value = digit;
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

  protected goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

}
