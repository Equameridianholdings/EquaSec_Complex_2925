import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DataService } from '../services/data.service';
import { StorageService } from '../services/storage.service';
import { Loader } from '../components/loader/loader';

interface IncidentReport {
  _id: string;
  description: string;
  sos: {
    date: string;
    guard?: {
      _id: string;
      name: string;
      emailAddress: string;
    };
    station?: {
      type: string;
      name: string;
      complexId: string;
      complexName: string;
      gatedCommunityId: string;
      gatedCommunityName: string;
      locationType?: string;        // 'complex' | 'houses'
      locationComplexId?: string;
      locationComplexName?: string; // complex name OR 'Standalone Houses'
    };
  };
}

@Component({
  selector: 'app-guard-incidents',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './guard-incidents.html',
  styleUrl: './guard-incidents.css',
})
export class GuardIncidents implements OnInit {
  private readonly dataService = inject(DataService);
  private readonly storageService = inject(StorageService);
  private readonly router = inject(Router);

  loading = signal(false);
  incidents = signal<IncidentReport[]>([]);
  loadError = '';

  searchDescription = '';
  filterDateFrom = '';
  filterDateTo = '';
  filterStation = '';

  get guardName(): string {
    const user = this.getCurrentUser();
    if (!user) return 'Guard';
    return `${user.name ?? ''} ${user.surname ?? ''}`.trim() || 'Guard';
  }

  get guardInitials(): string {
    return this.guardName.trim().slice(0, 2).toUpperCase();
  }

  get stationOptions(): string[] {
    const names = new Set<string>();
    for (const inc of this.incidents()) {
      const name = inc.sos?.station?.name;
      if (name) names.add(name);
    }
    return Array.from(names).sort();
  }

  get filteredIncidents(): IncidentReport[] {
    const desc = this.searchDescription.trim().toLowerCase();
    const station = this.filterStation.trim();
    const from = this.filterDateFrom ? new Date(this.filterDateFrom) : null;
    const to = this.filterDateTo ? new Date(this.filterDateTo + 'T23:59:59') : null;

    return this.incidents().filter((inc) => {
      if (desc && !inc.description.toLowerCase().includes(desc)) return false;

      if (station && inc.sos?.station?.name !== station) return false;

      if (from || to) {
        const incDate = new Date(inc.sos?.date);
        if (from && incDate < from) return false;
        if (to && incDate > to) return false;
      }

      return true;
    });
  }

  /** Full human-readable location string for a single incident */
  locationLabel(inc: IncidentReport): string {
    const s = inc.sos?.station;
    if (!s) return 'Unknown';

    const base = s.gatedCommunityName || s.complexName || s.name || 'Unknown';

    // General = entire community, no sub-location suffix
    if (s.locationType === 'general') {
      return base;
    }

    if (s.gatedCommunityName && s.locationComplexName) {
      return `${base} › ${s.locationComplexName}`;
    }
    return base;
  }

  ngOnInit(): void {
    this.loadIncidents();
  }

  private loadIncidents(): void {
    this.loading.set(true);
    this.loadError = '';
    this.dataService.get<any>('incident/my-reports').subscribe({
      next: (response) => {
        this.incidents.set(Array.isArray(response?.payload) ? response.payload : []);
        this.loading.set(false);
      },
      error: () => {
        this.loadError = 'Failed to load incident reports. Please try again.';
        this.loading.set(false);
      },
    });
  }

  clearFilters(): void {
    this.searchDescription = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterStation = '';
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }

  private formatDateOnly(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(d);
  }

  private formatTimeOnly(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }

  // ── PDF generation ───────────────────────────────────
  private loadLogoBase64(): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Draw through canvas so browser corrects EXIF rotation before jsPDF receives it
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = () => resolve(null);
      img.src = '/Equameridian Holdings .jpeg';
    });
  }

  private buildPdfDoc(logoDataUrl?: string | null): jsPDF {
    const incidents = this.filteredIncidents;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    // A4 landscape: 297 x 210 mm
    const pageW = 297;
    const rightEdge = pageW - 14;

    const generatedOn = new Intl.DateTimeFormat('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());

    // ── Logo + contact (top right) ──
    // Square logo — equal width and height so the image is never stretched
    const logoW = 30;
    const logoH = 30;
    const logoX = rightEdge - logoW;
    const logoY = 4;

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'JPEG', logoX, logoY, logoW, logoH);
    }

    doc.setFontSize(7.5);

    // Contact text sits to the LEFT of the logo, vertically centred with it
    const lineGap = 4.5;
    const textRight = logoX - 4;                             // right edge of text block, 4 mm gap from logo
    const textBlockH = lineGap * 2;                          // total span across 3 lines
    const line1Y = logoY + (logoH - textBlockH) / 2 + 3;    // +3 accounts for font baseline offset

    // Helper: draw "label" in grey + "value" in blue+underline, right-aligned
    const drawLinkLine = (label: string, value: string, y: number, url: string) => {
      const valueW = doc.getTextWidth(value);
      const labelW = doc.getTextWidth(label);
      const totalW = labelW + valueW;
      const blockLeft = textRight - totalW;

      // Grey label
      doc.setTextColor(71, 85, 105);
      doc.text(label, blockLeft, y);

      // Blue underlined value
      doc.setTextColor(37, 99, 235);   // blue-600
      doc.text(value, blockLeft + labelW, y);
      // Underline: thin line 0.3 mm below baseline
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.25);
      doc.line(blockLeft + labelW, y + 0.5, blockLeft + labelW + valueW, y + 0.5);

      // Invisible link hotspot over the whole line
      doc.link(blockLeft, y - 2.5, totalW, 3.5, { url });
    };

    drawLinkLine('website: ', 'info.equasec.co.za',                   line1Y,              'https://info.equasec.co.za/');
    drawLinkLine('contact no: ', '+27 66 273 7455',                   line1Y + lineGap,    'https://wa.me/27662737455');
    drawLinkLine('email: ', 'kkpartners@equameridianholdings.com',     line1Y + lineGap * 2,'mailto:kkpartners@equameridianholdings.com');

    // Reset colours for the rest of the document
    doc.setTextColor(71, 85, 105);
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);

    // ── Left header ──
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text('EquaSec — Incident Book', 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Guard: ${this.guardName}`, 14, 26);
    doc.text(`Generated: ${generatedOn}`, 14, 31);
    doc.text(`Total records: ${incidents.length}`, 14, 36);

    const rows = incidents.map((inc) => [
      this.formatDateOnly(inc.sos.date),
      this.formatTimeOnly(inc.sos.date),
      inc.sos.station?.gatedCommunityName
        ? (inc.sos.station.locationType === 'general'
            ? inc.sos.station.gatedCommunityName
            : inc.sos.station.locationComplexName
              ? `${inc.sos.station.gatedCommunityName} › ${inc.sos.station.locationComplexName}`
              : inc.sos.station.gatedCommunityName)
        : (inc.sos.station?.complexName || inc.sos.station?.name || 'Unknown'),
      inc.description,
      inc.sos.guard?.name ?? 'N/A',
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['Date', 'Time', 'Location', 'Incident', 'Guard on Duty']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 4, valign: 'middle', overflow: 'linebreak' },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 18 },
        2: { cellWidth: 38 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 38 },
      },
      margin: { left: 14, right: 14 },
    });

    return doc;
  }

  async downloadPdf(): Promise<void> {
    if (this.filteredIncidents.length === 0) return;
    const logo = await this.loadLogoBase64();
    const doc = this.buildPdfDoc(logo);
    const safeName = this.guardName.replace(/\s+/g, '_');
    doc.save(`EquaSec_IncidentBook_${safeName}.pdf`);
  }

  // ── Email PDF ─────────────────────────────────────────
  isEmailModalOpen = false;
  recipientEmail = '';
  emailError = '';
  emailSending = signal(false);
  emailSuccess = false;

  openEmailModal(): void {
    this.recipientEmail = '';
    this.emailError = '';
    this.emailSuccess = false;
    this.isEmailModalOpen = true;
  }

  closeEmailModal(): void {
    if (this.emailSending()) return;
    this.isEmailModalOpen = false;
  }

  sendPdfByEmail(): void {
    const email = this.recipientEmail.trim();
    if (!email) {
      this.emailError = 'Please enter a recipient email address.';
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      this.emailError = 'Please enter a valid email address.';
      return;
    }
    if (this.filteredIncidents.length === 0) {
      this.emailError = 'There are no incidents on screen to send.';
      return;
    }

    this.emailError = '';
    this.emailSending.set(true);

    this.loadLogoBase64().then((logo) => {
      const doc = this.buildPdfDoc(logo);

      // Convert to base64 via arraybuffer (reliable for any PDF size)
      const arrayBuffer = doc.output('arraybuffer');
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...(bytes.subarray(i, i + chunkSize) as unknown as number[]));
      }
      const pdfBase64 = btoa(binary);

      const payload = {
        recipientEmail: email,
        guardName: this.guardName,
        pdfBase64,
      };

      this.dataService.post<any>('incident/email-report', payload).subscribe({
        next: () => {
          this.emailSending.set(false);
          this.emailSuccess = true;
          setTimeout(() => {
            this.isEmailModalOpen = false;
            this.emailSuccess = false;
          }, 2500);
        },
        error: (err: any) => {
          this.emailError = err?.error?.message ?? 'Failed to send report. Please try again.';
          this.emailSending.set(false);
        },
      });
    });
  }

  goBack(): void {
    this.router.navigate(['/guard-portal']);
  }

  private getCurrentUser(): any | null {
    const raw = this.storageService.getItem('current-user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
