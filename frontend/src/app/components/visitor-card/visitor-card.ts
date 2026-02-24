import { Component, Input, OnInit } from '@angular/core';
import { getHours, shareCode, visitorDTO } from '../../interfaces/visitorDTO';

@Component({
  selector: 'app-visitor-card',
  imports: [],
  templateUrl: './visitor-card.html',
  styleUrl: '../../dashboard/dashboard.css',
})
export class VisitorCard implements OnInit{
  @Input() visitor!: visitorDTO;
  hours!: number;

  ngOnInit(): void {
    this.hours = getHours(this.visitor);
  }
  
  shareVisitorCode() {
    shareCode(this.visitor);
  }
}
