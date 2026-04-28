import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../services/data.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { ResponseBody } from '../../../interfaces/ResponseBody';
import { Loader } from '../../../components/loader/loader';

@Component({
  selector: 'app-generate-link-modal',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './generate-link-modal.html',
  styleUrls: ['../../dashboard.css', './generate-link-modal.css']
})
export class GenerateLinkModal {
  private service = inject(DataService);
  private _snackBar = inject(MatSnackBar);
  public dialogRef = inject(MatDialogRef<GenerateLinkModal>);

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  generatedUrl = signal<string | null>(null);
  generating = signal(false);
  linkCopied = signal(false);

  generateLink() {
    this.generating.set(true);
    this.generatedUrl.set(null);
    this.linkCopied.set(false);

    this.service.post<ResponseBody>('visitor/generate-checkin-link', {}).subscribe({
      next: (res) => {
        const payload = res.payload as { token: string; url: string };
        this.generatedUrl.set(payload.url);
        this.generating.set(false);
        this._snackBar.open('Link generated! Share it with your visitor.', 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
      },
      error: (err) => {
        this._snackBar.open(err?.error?.message ?? 'Failed to generate link.', 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.generating.set(false);
      },
    });
  }

  copyLink() {
    const url = this.generatedUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2500);
    });
  }

  shareViaWhatsApp() {
    const url = this.generatedUrl();
    if (!url) return;
    const text = encodeURIComponent(
      `Hi! Please use this link to check yourself in as a visitor. It is valid for 24 hours and can only be used once: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  closeModal() {
    this.dialogRef.close();
  }
}
