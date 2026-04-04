import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.models';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css'],
})
export class CheckoutComponent implements OnInit {
  phone: string = '';
  name: string = '';
  isSubmitting = false;
  private order: Order | null = null;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private orderService: OrderService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.name = localStorage.getItem('clientName') ?? '';
      this.phone = localStorage.getItem('clientPhone') ?? '';

      const restaurantId = localStorage.getItem('currentRestaurantId');
      const clientSessionId = localStorage.getItem('clientSessionId');

      if (restaurantId && clientSessionId) {
        this.orderService.getCurrentOrder(restaurantId, clientSessionId).subscribe(() => {
          this.orderService.order$.subscribe(order => {
            this.order = order ?? null;
            console.log('order carregado:', order);
          });
        });
      }
    }
  }

  get isPhoneValid(): boolean {
    return this.phone.replace(/\D/g, '').length >= 10;
  }

  get isValid(): boolean {
    return this.name.trim().length > 0 && this.isPhoneValid;
  }

  formatPhone(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    if (value.length > 11) value = value.slice(0, 11);

    if (value.length <= 2) {
      value = value;
    } else if (value.length <= 7) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    }

    this.phone = value;
    this.cdr.detectChanges();
  }

  advance(): void {
    if (!this.isValid || this.isSubmitting) return;

    const orderId = this.order?.id;
    const restaurantId = this.order?.restaurantId;

    if (!orderId || !restaurantId) return;

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const payload = {
      orderId,
      phone: this.phone,
      name: this.name.trim(),
    };

    this.http.patch(`https://localhost:44356/environment.apiUrl/Orders/complete-checkout/${orderId}`, payload).subscribe({
      next: () => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('clientName', this.name.trim());
          localStorage.setItem('clientPhone', this.phone);
          localStorage.setItem('orderJustCompleted', 'true');
        }
        this.orderService.clearOrder();
        this.router.navigate(['/finalize-order']);
      },
      error: () => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/cart']);
  }

  onPhoneBlur(): void {
    if (!this.isPhoneValid) return;

    this.http.get<{ name: string }>(`https://localhost:44356/environment.apiUrl/Orders/existing-phone/${this.phone}`)
      .subscribe({
        next: (res) => {
          if (res?.name && !this.name) {
            this.name = res.name;
            this.cdr.detectChanges();
          }
        },
        error: () => { }
      });
  }
}