import { Component, ChangeDetectorRef, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Order, OrderStatus, PaginatedResponse, DeliveryMode, PaymentWay } from '../../models/order.models';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-history',
  imports: [CommonModule, FormsModule],
  templateUrl: './history.html',
  styleUrl: './history.css',
})
export class History {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  groupedOrders: { date: string; orders: Order[]; totalOrders: number; totalSales: number }[] = [];

  page = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;

  searchQuery = '';
  startDate = '';
  endDate = '';

  statusFilter: OrderStatus | '' = '';
  isLoading = false;
  restaurantId = '';

  readonly OrderStatus = OrderStatus;
  readonly DeliveryMode = DeliveryMode;
  readonly PaymentWay = PaymentWay;

  selectedOrder: Order | null = null;
  private isBrowser: boolean;

  constructor(
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.restaurantId = localStorage.getItem('restaurantId') ?? '';
      this.loadHistory();
    }
  }

  loadHistory(): void {
    if (!this.restaurantId) {
      if (this.isBrowser) {
        console.warn('restaurantId não encontrado');
      }

      this.orders = [];
      this.filteredOrders = [];
      return;
    }

    this.isLoading = true;

    this.orderService.getOrderHistory(this.restaurantId, this.page, this.pageSize)
      .subscribe({
        next: (response: PaginatedResponse<Order>) => {
          this.ngZone.run(() => {
            this.orders = response.data ?? [];
            this.totalItems = response.totalItems;
            this.totalPages = response.totalPages;
            this.page = response.page;
            this.pageSize = response.pageSize;

            this.applyLocalFilters();
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            console.error('Erro ao carregar histórico', error);
            this.orders = [];
            this.filteredOrders = [];
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }
      });
  }

  onSearch(): void {
    this.applyLocalFilters();
  }

  setFilter(status: OrderStatus | ''): void {
    this.statusFilter = status;
    this.applyLocalFilters();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadHistory();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadHistory();
    }
  }

  openOrder(order: Order): void {
    this.orderService.getOrderById(order.id!).subscribe({
      next: (fullOrder) => {
        this.ngZone.run(() => {
          this.selectedOrder = fullOrder;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.selectedOrder = order;
        this.cdr.detectChanges();
      }
    });
  }
  closeOrder(): void {
    this.selectedOrder = null;
    this.cdr.detectChanges();
  }

  formatDate(date?: string): string {
    if (!date) return '--';
    const str = date.endsWith('Z') ? date : `${date}Z`;
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return '--';
    return parsed.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo', // ← aqui também
    });
  }

  getDeliveryLabel(mode?: DeliveryMode): string {
    switch (mode) {
      case DeliveryMode.Delivery: return 'Entrega';
      case DeliveryMode.Pickup: return 'Retirada';
      default: return '--';
    }
  }

  getPaymentLabel(way?: PaymentWay | null): string {
    switch (way) {
      case PaymentWay.Pix: return 'Pix';
      case PaymentWay.Cash: return 'Dinheiro';
      case PaymentWay.Card: return 'Cartão';
      default: return '--';
    }
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    return new Date(str).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    });
  }

  formatCurrency(value?: number): string {
    return (value ?? 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  getStatusLabel(status?: OrderStatus): string {
    switch (status) {
      case OrderStatus.PendingConfirmation: return 'Pendente';
      case OrderStatus.Preparing: return 'Preparando';
      case OrderStatus.OnTheWay: return 'A caminho';
      case OrderStatus.Ready: return 'Concluído';
      case OrderStatus.Canceled: return 'Cancelado';
      default: return 'Desconhecido';
    }
  }

  private applyLocalFilters(): void {
    let result = [...this.orders];

    if (this.statusFilter !== '') {
      result = result.filter(o => o.status === this.statusFilter);
    }

    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(o =>
        String(o.orderNumber ?? '').toLowerCase().includes(query)
      );
    }

    if (this.startDate) {
      const start = new Date(`${this.startDate}T00:00:00-03:00`);
      result = result.filter(o => {
        if (!o.createdAt) return false;
        const str = o.createdAt.endsWith('Z') ? o.createdAt : `${o.createdAt}Z`;
        return new Date(str) >= start;
      });
    }

    if (this.endDate) {
      const end = new Date(`${this.endDate}T23:59:59-03:00`);
      result = result.filter(o => {
        if (!o.createdAt) return false;
        const str = o.createdAt.endsWith('Z') ? o.createdAt : `${o.createdAt}Z`;
        return new Date(str) <= end;
      });
    }

    this.filteredOrders = result;
    this.groupByDay();
  }

  private groupByDay(): void {
    const map = new Map<string, Order[]>();

    for (const order of this.filteredOrders) {
      const raw = order.createdAt;
      let key = 'Sem data';

      if (raw) {
        const str = raw.endsWith('Z') ? raw : `${raw}Z`;
        key = new Date(str).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'America/Sao_Paulo', // ← isso resolve
        });
      }

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(order);
    }

    this.groupedOrders = Array.from(map.entries()).map(([date, orders]) => ({
      date,
      orders,
      totalOrders: orders.length,
      totalSales: orders.reduce((sum, o) => sum + (o.total ?? 0), 0),
    }));
  }

  goToPage(p: number): void {
    this.page = p;
    this.loadHistory();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.page;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    pages.push(1);

    if (current > 3) pages.push(-1); // ellipsis

    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }

    if (current < total - 2) pages.push(-1); // ellipsis

    pages.push(total);

    return pages;
  }

  onPageSizeChange(): void {
  this.page = 1;
  this.loadHistory();
}
}