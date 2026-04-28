import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataService } from '../../../services/data.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-self-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './self-checkin.html',
  styleUrl: '../../dashboard.css',
})
export class SelfCheckin {
  public generatedLink: string | null = null;
  public submitting = false;
  public canShare = false;

  constructor(private dataService: DataService, private snackBar: MatSnackBar) {
    this.canShare = !!(navigator.share);
  }

  generateSelfCheckinLink() {
    const confirmed = window.confirm('Are you sure you want to generate a new self check-in link?');
    if (!confirmed) {
      return;
    }
    this.submitting = true;
    this.dataService.post<any>('visitor/self-checkin-link', {}).subscribe({
      next: (res) => {
        this.generatedLink = res.payload.link;
        this.snackBar.open('Self check-in link generated!', 'close', { duration: 3000 });
        this.submitting = false;
      },
      error: (err) => {
        this.snackBar.open(err.error.message || 'Failed to generate link', 'close', { duration: 3000 });
        this.submitting = false;
      },
    });
  }

  copyLinkToClipboard() {
    if (this.generatedLink) {
      window.navigator.clipboard.writeText(this.generatedLink);
      this.snackBar.open('Link copied!', 'close', { duration: 2000 });
    }
  }

  shareLink() {
    if (this.generatedLink && navigator.share) {
      navigator.share({
        title: 'Self Check-In Link',
        text: 'Use this link to self check-in:',
        url: this.generatedLink
      }).catch(() => {
        this.snackBar.open('Sharing failed or was cancelled.', 'close', { duration: 2000 });
      });
    }
  }
}
