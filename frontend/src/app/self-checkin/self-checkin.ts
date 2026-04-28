import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Loader } from '../components/loader/loader';

interface SelfCheckinContext {
  complexName: string;
  unitNumber: string | number;
  expiry: string;
  token: string;
}

interface SelfCheckinResult {
  code?: number;
  name?: string;
  surname?: string;
}

@Component({
  selector: 'app-self-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './self-checkin.html',
  styleUrl: './self-checkin.css',
})
export class SelfCheckin implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  private apiUrl = process.env['NG_APP_API_URI'];

  // States: loading | invalid | form | submitting | success | error
  state = signal<'loading' | 'invalid' | 'form' | 'submitting' | 'success' | 'error'>('loading');
  errorMessage = signal<string>('');
  context = signal<SelfCheckinContext | null>(null);
  result = signal<SelfCheckinResult | null>(null);
  codeCopied = signal(false);

  // Form fields
  name = '';
  surname = '';
  contact = '';
  driving = false;
  vehicleColor = '';
  vehicleMake = '';
  vehicleModel = '';
  vehicleReg = '';

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage.set('Invalid link. Please ask your host for a new one.');
      this.state.set('invalid');
      return;
    }

    this.http.get<{ message: string; payload: SelfCheckinContext }>(`${this.apiUrl}/visitor/self-checkin/${this.token}`).subscribe({
      next: (res) => {
        this.context.set(res.payload);
        this.state.set('form');
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'This link is no longer valid.');
        this.state.set('invalid');
      },
    });
  }

  submitForm(): void {
    if (!this.name.trim() || !this.surname.trim() || !this.contact.trim()) return;

    this.state.set('submitting');

    const body: Record<string, unknown> = {
      name: this.name.trim(),
      surname: this.surname.trim(),
      contact: this.contact.trim(),
      driving: this.driving,
    };

    if (this.driving) {
      body['vehicle'] = {
        color: this.vehicleColor.trim(),
        make: this.vehicleMake.trim(),
        model: this.vehicleModel.trim(),
        registrationNumber: this.vehicleReg.trim(),
      };
    }

    this.http
      .post<{ message: string; payload: SelfCheckinResult }>(`${this.apiUrl}/visitor/self-checkin/${this.token}`, body)
      .subscribe({
        next: (res) => {
          this.result.set(res.payload);
          this.state.set('success');
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.message ?? 'Something went wrong. Please try again.');
          this.state.set('error');
        },
      });
  }

  copyPin(): void {
    const code = this.result()?.code;
    if (!code) return;
    
    navigator.clipboard.writeText(String(code)).then(() => {
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2500);
    });
  }
}
