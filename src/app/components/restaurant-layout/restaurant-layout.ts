import { ChangeDetectorRef, Component, Inject, NgZone, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterOutlet, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { OrderStatus } from '../../models/order.models';
import { RestaurantService } from '../../services/restaurant.service';
import { environment } from '../../environments/environment';

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

  restaurantName = '';
  restaurantInitials = '';
  isOpen = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private restaurantService: RestaurantService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.route.params.subscribe(params => {
      this.restaurantId = params['restaurantId'];
      this.loadPendingCount();
      this.loadRestaurantInfo();
      if (isPlatformBrowser(this.platformId)) {
        document.addEventListener('click', () => {
          this.storeMenuOpen = false;
        });
      }
    });
  }

  loadRestaurantInfo(): void {
    if (!isPlatformBrowser(this.platformId) || !this.restaurantId) return;
    this.restaurantService.getRestaurant(this.restaurantId).subscribe({
      next: (restaurant) => {
        this.ngZone.run(() => {
          this.restaurantName = restaurant.name;
          this.restaurantInitials = restaurant.name
            .split(' ')
            .slice(0, 2)
            .map((word: string) => word[0].toUpperCase())
            .join('');
          this.isOpen = this.restaurantService.isCurrentlyOpen(restaurant.openingHours);
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.restaurantName = 'Restaurante';
        this.restaurantInitials = 'R';
        this.cdr.detectChanges();
      }
    });
  }

  checkIsOpen(openingHours: any[]): boolean {
    if (!openingHours || openingHours.length === 0) return false;

    const now = new Date();
    const today = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todayHours = openingHours.find(h => h.dayOfWeek === today);
    if (!todayHours) return false;

    const [openH, openM] = todayHours.openTime.split(':').map(Number);
    const [closeH, closeM] = todayHours.closeTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
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