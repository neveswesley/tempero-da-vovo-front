import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.models';
import { environment } from '../../environments/environment';

interface Neighborhood {
  id: string;
  name: string;
  city: string;
  deliveryFee: number;
}

type DeliveryMode = 'delivery' | 'pickup' | null;
type PaymentMethod = 'cash' | 'card' | 'pix' | 'online' | null;

@Component({
  selector: 'app-finalize-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finalize-order.html',
  styleUrls: ['./finalize-order.css'],
})
export class FinalizeOrderComponent implements OnInit {
  order: Order | null = null;
  clientName: string = '';
  clientPhone: string = '';

  // Entrega
  deliveryMode: DeliveryMode = null;
  neighborhoods: Neighborhood[] = [];
  selectedNeighborhood: Neighborhood | null = null;
  showNeighborhoodModal = false;
  neighborhoodSearch: string = '';
  showDeliveryOptions = true;

  // Pagamento
  paymentMethod: PaymentMethod = null;
  changeAmountRaw: string = 'R$ 0,00';
  payOnDeliveryExpanded = true;
  showPaymentOptions = true;

  // UI
  isSubmitting = false;

  private readonly paymentWayMap: Record<string, number> = {
    'pix': 0,
    'cash': 1,
    'card': 2,
    'online': 3,
  };

  private readonly deliveryModeMap: Record<string, number> = {
    'delivery': 0,
    'pickup': 1,
  };

  noChange: boolean = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private orderService: OrderService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.clientName = localStorage.getItem('clientName') ?? '';
      this.clientPhone = localStorage.getItem('clientPhone') ?? '';

      const stored = localStorage.getItem('selectedNeighborhood');
      const savedMode = localStorage.getItem('deliveryMode') as DeliveryMode;

      if (stored && savedMode === 'delivery') {
        this.selectedNeighborhood = JSON.parse(stored);
        this.deliveryMode = 'delivery';
        this.showDeliveryOptions = false;
      } else if (savedMode === 'pickup') {
        this.deliveryMode = 'pickup';
        this.showDeliveryOptions = false;
      }
    }

    this.orderService.order$.subscribe(order => {
      this.order = order ?? null;
      if (this.order?.restaurantId) {
        this.loadNeighborhoods(this.order.restaurantId);
      }
      this.cdr.detectChanges();
    });

    if (isPlatformBrowser(this.platformId)) {
      const restaurantId = localStorage.getItem('currentRestaurantId');
      const clientSessionId = localStorage.getItem('clientSessionId');
      if (restaurantId && clientSessionId) {
        this.orderService.getCurrentOrder(restaurantId, clientSessionId).subscribe();
      }
    }
  }

  loadNeighborhoods(restaurantId: string): void {
    this.http.get<Neighborhood[]>(`${environment.apiUrl}/api/Neighborhoods/${restaurantId}`)
      .subscribe({
        next: (data) => {
          this.neighborhoods = data;
          this.cdr.detectChanges();
        },
        error: () => { }
      });
  }

  get filteredNeighborhoods(): Neighborhood[] {
    if (!this.neighborhoodSearch.trim()) return this.neighborhoods;
    return this.neighborhoods.filter(n =>
      n.name.toLowerCase().includes(this.neighborhoodSearch.toLowerCase())
    );
  }

  get deliveryAddress(): string[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    const street = localStorage.getItem('addr_street') ?? '';
    const number = localStorage.getItem('addr_number') ?? '';
    const complement = localStorage.getItem('addr_complement') ?? '';
    const reference = localStorage.getItem('addr_reference') ?? '';
    const neighborhood = this.selectedNeighborhood?.name ?? '';
    const city = this.selectedNeighborhood?.city ?? '';

    return [
      [street, number].filter(v => v).join(', '),
      complement,
      reference,
      [neighborhood, city].filter(v => v).join(', '),
    ].filter(v => v);
  }

  selectDeliveryMode(mode: DeliveryMode): void {
    this.deliveryMode = mode;
    this.paymentMethod = null;
    this.changeAmountRaw = 'R$ 0,00';
    this.showPaymentOptions = true;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('deliveryMode', mode ?? '');
    }

    if (mode === 'delivery') {
      this.neighborhoodSearch = '';
      this.showNeighborhoodModal = true;
    } else {
      this.selectedNeighborhood = null;
      this.showDeliveryOptions = false;
      if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem('selectedNeighborhood');
      }
    }
    this.cdr.detectChanges();
  }

  openDeliveryOptions(): void {
    this.showDeliveryOptions = true;
    this.cdr.detectChanges();
  }

  openPaymentOptions(): void {
    this.showPaymentOptions = true;
    this.paymentMethod = null;
    this.cdr.detectChanges();
  }

  confirmCash(): void {
    this.showPaymentOptions = false;
    this.cdr.detectChanges();
  }

  openNeighborhoodModal(): void {
    this.neighborhoodSearch = '';
    this.showNeighborhoodModal = true;
    this.cdr.detectChanges();
  }

  selectNeighborhood(n: Neighborhood): void {
    this.selectedNeighborhood = n;
    this.showNeighborhoodModal = false;
    this.showDeliveryOptions = false;
    this.neighborhoodSearch = '';

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('selectedNeighborhood', JSON.stringify(n));
    }

    this.router.navigate(['/address']);
    this.cdr.detectChanges();
  }

  closeNeighborhoodModal(): void {
    if (!this.selectedNeighborhood) {
      this.deliveryMode = null;
      this.showDeliveryOptions = true;
      if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem('deliveryMode');
      }
    }
    this.showNeighborhoodModal = false;
    this.neighborhoodSearch = '';
    this.cdr.detectChanges();
  }

  selectPayment(method: PaymentMethod): void {
    this.paymentMethod = method;
    this.changeAmountRaw = 'R$ 0,00';
    this.payOnDeliveryExpanded = true;
    if (method !== 'cash') {
      this.showPaymentOptions = false;
    }
    this.cdr.detectChanges();
  }

  onChangeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let raw = input.value.replace(/\D/g, '');
    if (!raw) raw = '0';
    const num = parseInt(raw, 10) / 100;
    this.changeAmountRaw = 'R$ ' + num.toFixed(2).replace('.', ',');
    input.value = this.changeAmountRaw; // força o valor no input diretamente
    this.cdr.detectChanges();
  }

  get changeAmountValue(): number {
    if (this.noChange) return this.total;
    const cleaned = this.changeAmountRaw.replace('R$ ', '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  get changeIsInsufficient(): boolean {
    if (this.noChange) return false;
    return this.paymentMethod === 'cash' && this.changeAmountValue > 0 && this.changeAmountValue < this.total;
  }

  get subtotal(): number {
    return this.order?.total ?? 0;
  }

  get deliveryFee(): number {
    if (this.deliveryMode === 'pickup') return 0;
    return this.selectedNeighborhood?.deliveryFee ?? 0;
  }

  get total(): number {
    return this.subtotal + this.deliveryFee;
  }

  get canSubmit(): boolean {
    if (!this.deliveryMode) return false;
    if (this.deliveryMode === 'delivery' && !this.selectedNeighborhood) return false;
    if (!this.paymentMethod) return false;
    if (this.changeIsInsufficient) return false;
    return true;
  }

  formatPrice(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }

  goToIdentify(): void {
    this.router.navigate(['/checkout']);
  }

  goBack(): void {
    const restaurantId = localStorage.getItem('currentRestaurantId');
    if (restaurantId) {
      this.router.navigate(['/delivery-home', restaurantId]);
    } else {
      this.router.navigate(['/cart']);
    }
  }

  togglePayOnDelivery(): void {
    this.payOnDeliveryExpanded = !this.payOnDeliveryExpanded;
    this.cdr.detectChanges();
  }

  toggleNoChange(): void {
    this.noChange = !this.noChange;
    this.changeAmountRaw = 'R$ 0,00';
    this.cdr.detectChanges();
  }

  submitOrder(): void {
    if (!this.canSubmit || this.isSubmitting) return;
    this.isSubmitting = true;

    const addressNameMap: Record<string, number> = {
      'Home': 0,
      'Work': 1,
      'Friends': 2,
    };

    const request = {
      orderId: this.order?.id,
      deliveryMode: this.deliveryModeMap[this.deliveryMode!],
      street: localStorage.getItem('addr_street') ?? '',
      number: localStorage.getItem('addr_number') ?? '',
      complement: localStorage.getItem('addr_complement') ?? null,
      reference: localStorage.getItem('addr_reference') ?? null,
      neighborhoodId: this.selectedNeighborhood?.id ?? null,
      city: this.selectedNeighborhood?.city ?? '',
      addressName: addressNameMap[localStorage.getItem('addr_name') ?? 'Home'] ?? 0,
      paymentWay: this.paymentWayMap[this.paymentMethod!],
      amountGiven: this.paymentMethod === 'cash' ? this.changeAmountValue : null,
      deliveryFee: this.deliveryFee,
    };

    this.http.put(`${environment.apiUrl}/api/Orders/finalize-order/${this.order?.id}`, request)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('lastOrderId', this.order?.id ?? '');
          }
          this.router.navigate(['/confirmation']);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erro ao finalizar pedido:', err);
        },
      });
  }
}