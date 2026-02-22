import { Component, Input } from '@angular/core';
import { getHours, shareCode, visitorDTO } from '../../interfaces/visitorDTO';

@Component({
  selector: 'app-visitor-card',
  imports: [],
  templateUrl: './visitor-card.html',
  styleUrl: '../../dashboard/dashboard.css',
})
export class VisitorCard {
  @Input({ required: true }) visitor!: visitorDTO;
  hours: number = getHours(this.visitor);
  
  shareVisitorCode() {
    shareCode(this.visitor);
  }
}
