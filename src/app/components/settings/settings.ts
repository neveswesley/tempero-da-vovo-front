// settings.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css'],
})
export class SettingsComponent {

  constructor(private router: Router, private route: ActivatedRoute) {}

  isTab(tab: string): boolean {
    return this.router.url.includes(`/settings/${tab}`);
  }

  navigate(tab: string): void {
    const restaurantId = this.route.snapshot.parent?.paramMap.get('restaurantId');
    this.router.navigate([`/restaurant/${restaurantId}/settings/${tab}`]);
  }
}