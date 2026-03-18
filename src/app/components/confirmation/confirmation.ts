import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-confirmacao',
  standalone: true,
  imports: [],
  templateUrl: './confirmation.html',
  styleUrls: ['./confirmation.css'],
})
export class ConfirmationComponent {

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  openWhatsApp(): void {
    const phone = '5524999448415';
    const message = encodeURIComponent('Quero acompanhar meu pedido!');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  }

  goToOrders(): void {
    const lastOrderId = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('lastOrderId')
      : null;

    if (lastOrderId) {
      this.router.navigate(['/orders'], { queryParams: { orderId: lastOrderId } });
    } else {
      this.router.navigate(['/orders']);
    }
  }
}