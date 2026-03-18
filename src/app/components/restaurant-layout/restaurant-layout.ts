import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterOutlet, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { OrderStatus } from '../../models/order.models';

@Component({
  selector: 'app-restaurant-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './restaurant-layout.html',
  styleUrls: ['./restaurant-layout.css'],
})
export class RestaurantLayoutComponent {
  pendingCount = 0;
  private restaurantId!: string;
  storeMenuOpen = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.route.params.subscribe(params => {
      this.restaurantId = params['restaurantId'];
      this.loadPendingCount();
      if (isPlatformBrowser(this.platformId)) {
        document.addEventListener('click', () => {
          this.storeMenuOpen = false;
        });
      }
    });
  }

  loadPendingCount(): void {
    if (!isPlatformBrowser(this.platformId) || !this.restaurantId) return;
    this.http
      .get<any[]>(`${environment.apiUrl}/api/Orders/orders-by-restaurant/${this.restaurantId}`)
      .subscribe({
        next: (orders) => {
          this.pendingCount = orders.filter(o => o.status === OrderStatus.PendingConfirmation).length;
        },
        error: () => { this.pendingCount = 0; }
      });
  }

  isActive(section: string): boolean {
    return this.router.url.includes(section);
  }

  navigate(section: string): void {
    switch (section) {
      case 'orders':
        this.router.navigate([`/restaurant/${this.restaurantId}/orders`]);
        break;
      case 'menu':
        this.router.navigate([`/restaurant/${this.restaurantId}/list-products`]);
        break;
      case 'delivery-zones':
        this.router.navigate([`/restaurant/${this.restaurantId}/delivery-zones`]);
        break;
      case 'history':
        this.router.navigate([`/restaurant/${this.restaurantId}/history`]);
        break;
        case 'opening-hours':
        this.router.navigate([`/restaurant/${this.restaurantId}/opening-hours`]);
        break;
        case 'settings':
        this.router.navigate([`/restaurant/${this.restaurantId}/settings`]);
        break;
    }
  }

  toggleStoreMenu(): void {
    this.storeMenuOpen = !this.storeMenuOpen;
  }

  logout(): void {
    localStorage.removeItem('token');
    this.router.navigate(['/']);
  }

}