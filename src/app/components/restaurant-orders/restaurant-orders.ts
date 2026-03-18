import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Order,
  OrderStatus,
  DeliveryMode,
  PaymentWay,
  TimelineEvent,
  CancellationReasonType,
  CanceledBy,
} from '../../models/order.models';

// Shape expected by PUT cancel-order/{orderId}
interface CancelOrderRequestJson {
  clientSessionId: string;
  reason: CancellationReasonType;
  canceledBy: CanceledBy;
  description?: string;
}

@Component({
  selector: 'app-restaurant-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './restaurant-orders.html',
  styleUrls: ['./restaurant-orders.css'],
})
export class RestaurantOrdersComponent implements OnInit, OnDestroy {

  // ── State ─────────────────────────────────────────────
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  selectedOrder: Order | null = null;
  loading = true;
  error: string | null = null;

  private restaurantId!: string;

  // ── Sidebar ───────────────────────────────────────────
  activeSection: 'orders' | 'menu' | 'finance' | 'settings' = 'orders';

  // ── Collapsed status groups (always start collapsed) ──
  private collapsedGroups = new Set<string>(['new', 'preparing', 'onway', 'done', 'canceled']);

  // ── Timeline collapse ──
  timelineCollapsed = false;

  toggleGroup(group: string): void {
    if (this.collapsedGroups.has(group)) {
      this.collapsedGroups.delete(group);
    } else {
      this.collapsedGroups.add(group);
    }
  }

  isGroupCollapsed(group: string): boolean {
    return this.collapsedGroups.has(group);
  }

  // ── Topbar ────────────────────────────────────────────
  searchQuery = '';
  statusFilter: OrderStatus | '' = '';

  // ── Enums exposed to template ─────────────────────────
  OrderStatus = OrderStatus;
  DeliveryMode = DeliveryMode;
  PaymentWay = PaymentWay;
  CancellationReasonType = CancellationReasonType;

  // ── Cancel modal ─────────────────────────────────────
  showCancelModal = false;
  orderToCancel: Order | null = null;
  cancelReason: CancellationReasonType = CancellationReasonType.OutOfStock;
  cancelDescription = '';
  cancelError = '';

  showFeedbackModal = false;
  feedbackSuccess = false;

  // ── Reject modal (for PendingConfirmation in detail panel) ──
  showRejectModal = false;
  orderToReject: Order | null = null;
  rejectReason: CancellationReasonType = CancellationReasonType.OutOfStock;
  rejectDescription = '';
  rejectError = '';

  // ── Label maps ────────────────────────────────────────
  statusLabel: Record<OrderStatus, string> = {
    [OrderStatus.Draft]: 'Pedido criado',
    [OrderStatus.PendingConfirmation]: 'Aguardando confirmação',
    [OrderStatus.Preparing]: 'Em preparo',
    [OrderStatus.OnTheWay]: 'Saiu para entrega',
    [OrderStatus.Ready]: 'Pronto',
    [OrderStatus.Canceled]: 'Cancelado',
  };

  private advanceLabels: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.PendingConfirmation]: 'Confirmar pedido →',
    [OrderStatus.Preparing]: 'Despachar →'
  };

  get pendingCount(): number {
    return this.orders.filter(
      o => this.getStatus(o) === OrderStatus.PendingConfirmation,
    ).length;
  }

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  ngOnDestroy(): void {
    this.stopUiTimer();
  }

  private uiTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const params = this.route.snapshot.params['restaurantId']
      ?? this.route.snapshot.parent?.params['restaurantId'];

    this.restaurantId = params;
    this.loadOrders();
    this.startUiTimer();
  }

  private startUiTimer(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.stopUiTimer();

    this.uiTimer = setInterval(() => {
      this.ngZone.run(() => {
        // força o Angular a recalcular os métodos usados no template
        this.cdr.detectChanges();
      });
    }, 1000);
  }

  private stopUiTimer(): void {
    if (this.uiTimer) {
      clearInterval(this.uiTimer);
      this.uiTimer = null;
    }
  }


  getStatusLabel(status?: OrderStatus): string {
    if (!status) return '';

    switch (status) {
      case OrderStatus.PendingConfirmation:
        return 'Aguardando confirmação';
      case OrderStatus.Preparing:
        return 'Em preparo';
      case OrderStatus.OnTheWay:
        return 'Em rota';
      case OrderStatus.Ready:
        return 'Concluído';
      case OrderStatus.Canceled:
        return 'Cancelado';
      default:
        return '';
    }
  }

  abbreviateName(fullName: string | undefined): string {
    if (!fullName) return 'Cliente';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  // ── Data ──────────────────────────────────────────────
  loadOrders(): void {
    if (!this.restaurantId) return;

    this.loading = true;
    this.error = null;

    this.http
      .get<Order[]>(
        `${environment.apiUrl}/api/Orders/orders-by-restaurant/${this.restaurantId}`,
      )
      .subscribe({
        next: (orders) => {
          this.ngZone.run(() => {
            this.orders = orders.filter(o => o.status !== OrderStatus.Draft); this.applyFilters();
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.error = 'Erro ao carregar pedidos. Tente novamente.';
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
      });
  }

  // ── Filters ───────────────────────────────────────────
  onSearch(): void { this.applyFilters(); }
  onFilter(): void { this.applyFilters(); }

  applyFilters(): void {
    let result = [...this.orders];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        o =>
          String(o.orderNumber).includes(q) ||
          (o.customerName ?? '').toLowerCase().includes(q),
      );
    }

    if (this.statusFilter !== '') {
      result = result.filter(o => this.getStatus(o) === this.statusFilter);
    }

    // ── Filtro de 12 horas ────────────────────────────────
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    result = result.filter(o => {
      if (!o.createdAt) return true;
      const str = o.createdAt.endsWith('Z') ? o.createdAt : o.createdAt + 'Z';
      return new Date(str) >= twelveHoursAgo;
    });

    this.filteredOrders = result;
  }

  // ── Kanban columns ────────────────────────────────────
  getColumnOrders(status: OrderStatus): Order[] {
    return this.filteredOrders.filter(o => this.getStatus(o) === status);
  }

  // ── Advance status ────────────────────────────────────
  advanceStatus(order: Order, event?: Event): void {
    event?.stopPropagation();

    const current = this.getStatus(order);
    const nextMap: Partial<Record<OrderStatus, OrderStatus>> = {
      [OrderStatus.PendingConfirmation]: OrderStatus.Preparing,
      [OrderStatus.Preparing]: OrderStatus.OnTheWay,
      [OrderStatus.OnTheWay]: OrderStatus.Ready,
    };
    const next = nextMap[current];
    if (!next) return;

    this.updateOrderStatus(order.id ?? '', next);

    this.http.put(`${environment.apiUrl}/api/Orders/change-order-status/${order.id}`, {})
      .subscribe({
        error: (err) => {
          console.error('Erro ao avançar status', err);
          this.updateOrderStatus(order.id ?? '', current);
        }
      });
  }

  getAdvanceLabel(order: Order): string {
    const current = this.getStatus(order);
    if (order.deliveryMode === DeliveryMode.Pickup && current === OrderStatus.Preparing) {
      return 'Pronto p/ retirada →';
    }
    return this.advanceLabels[current] ?? 'Avançar →';
  }

  todayLabel = (() => {
    const text = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    }).format(new Date());

    return text.charAt(0).toUpperCase() + text.slice(1);
  })();

  // ── Print ─────────────────────────────────────────────
  printOrder(order: Order): void {
    console.log('Imprimir pedido', order.orderNumber);
    window.print();
  }

  // ── Cancel (for non-pending orders) ──────────────────
  cancelOrder(order: Order, event?: Event): void {
    event?.stopPropagation();
    console.log('order para cancelar:', order);
    console.log('order.id:', order.id);

    this.orderToCancel = order;
    this.cancelReason = CancellationReasonType.OutOfStock;
    this.cancelDescription = '';
    this.cancelError = '';
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.orderToCancel = null;
    this.cancelError = '';
  }

  // ── Reject (for PendingConfirmation orders in detail panel) ──
  rejectOrder(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.orderToReject = order;
    this.rejectReason = CancellationReasonType.OutOfStock;
    this.rejectDescription = '';
    this.rejectError = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.orderToReject = null;
    this.rejectError = '';
  }

  confirmReject(): void {
    if (!this.orderToReject) return;

    const orderId = this.orderToReject.id ?? '';

    const body: CancelOrderRequestJson = {
      clientSessionId: '',
      reason: this.rejectReason,
      canceledBy: CanceledBy.Restaurant,
      description: this.rejectDescription || undefined,
    };

    this.http
      .put<void>(`${environment.apiUrl}/api/Orders/cancel-order/${orderId}`, body)
      .pipe(
        catchError(() => {
          this.closeRejectModal();
          this.feedbackSuccess = false;
          this.showFeedbackModal = true;
          this.cdr.detectChanges();
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.updateOrderStatus(orderId, OrderStatus.Canceled);
        this.closeRejectModal();
        this.feedbackSuccess = true;
        this.showFeedbackModal = true;
        this.cdr.detectChanges();
      });
  }

  getAcceptCountdown(order: Order): string {
    const baseDate = order.pendingConfirmationAt ?? order.createdAt;
    if (!baseDate) return '';

    const str = baseDate.endsWith('Z') ? baseDate : baseDate + 'Z';
    const startedAt = new Date(str);
    const deadline = new Date(startedAt.getTime() + 8 * 60_000);

    const diff = deadline.getTime() - Date.now();
    const mins = Math.floor(diff / 60_000);
    const secs = Math.floor((diff % 60_000) / 1000);

    if (diff <= 0) return 'Expirado';
    if (mins === 0) return `${secs}s`;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  getAcceptTimerClass(order: Order): string {
    const baseDate = order.pendingConfirmationAt ?? order.createdAt;
    if (!baseDate) return 'timer-green';

    const str = baseDate.endsWith('Z') ? baseDate : baseDate + 'Z';
    const startedAt = new Date(str);
    const deadline = new Date(startedAt.getTime() + 8 * 60_000);

    const diff = deadline.getTime() - Date.now();
    const mins = Math.floor(diff / 60_000);

    if (diff <= 0) return 'timer-late';
    if (mins <= 2) return 'timer-red';
    if (mins <= 4) return 'timer-yellow';
    return 'timer-green';
  }

  confirmCancel(): void {
    if (!this.orderToCancel) return;

    const orderId = this.orderToCancel.id ?? '';

    const body: CancelOrderRequestJson = {
      clientSessionId: '',
      reason: this.cancelReason,
      canceledBy: CanceledBy.Restaurant,
      description: this.cancelDescription || undefined,
    };

    this.http.put(
      `${environment.apiUrl}/api/orders/cancel-order/${this.orderToCancel.id}`,
      body
    )
      .pipe(
        catchError(() => {
          this.closeCancelModal();
          this.feedbackSuccess = false;
          this.showFeedbackModal = true;
          this.cdr.detectChanges();
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.updateOrderStatus(orderId, OrderStatus.Canceled);
        this.closeCancelModal();
        this.feedbackSuccess = true;
        this.showFeedbackModal = true;
        this.cdr.detectChanges();
      });
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal = false;
  }

  // ── Helpers ───────────────────────────────────────────
  private updateOrderStatus(id: string, status: OrderStatus): void {
    const idx = this.orders.findIndex(o => o.id === id);
    if (idx !== -1) this.orders[idx].status = status;

    if (this.selectedOrder?.id === id) {
      this.selectedOrder = { ...this.orders[idx] };
    }

    this.applyFilters();
    this.cdr.detectChanges();
  }

  getStatus(order: Order): OrderStatus {
    return order.status ?? OrderStatus.PendingConfirmation;
  }

  formatCurrency(value: number | undefined | null): string {
    if (value == null) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    const d = new Date(str);
    return (
      d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) +
      ' às ' +
      d.toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      })
    );
  }

  getEstimatedDeliveryWindow(order: Order): string {
    if (!order.estimatedDeliveryTimeInMinutes || !order.createdAt) return '';

    const str = order.createdAt.endsWith('Z') ? order.createdAt : order.createdAt + 'Z';
    const created = new Date(str);
    const min = new Date(created.getTime() + order.estimatedDeliveryTimeInMinutes * 60_000);
    const max = new Date(created.getTime() + (order.estimatedDeliveryTimeInMinutes + 10) * 60_000);

    const fmt = (d: Date) =>
      d.toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      });

    return `${fmt(min)} – ${fmt(max)}`;
  }

  getTimeline(order: Order): TimelineEvent[] {
    const toTime = (dateStr?: string): string => {
      if (!dateStr) return '';
      const s = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
      return new Date(s).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      });
    };

    const createdAtStr = order.createdAt
      ? (order.createdAt.endsWith('Z') ? order.createdAt : order.createdAt + 'Z')
      : undefined;

    const status = this.getStatus(order);
    const isPickup = order.deliveryMode === DeliveryMode.Pickup;

    const steps: { label: string; minStatus: OrderStatus; timestamp?: string }[] = [
      {
        label: 'Pedido realizado',
        minStatus: OrderStatus.PendingConfirmation,
        timestamp: createdAtStr,
      },
      {
        label: 'Em preparo',
        minStatus: OrderStatus.Preparing,
        timestamp: order.preparingStartedAt,
      },
      {
        label: isPickup ? 'Pronto para retirada' : 'Saiu para entrega',
        minStatus: OrderStatus.OnTheWay,
        timestamp: order.onTheWayAt,
      },
      {
        label: isPickup ? 'Retirado' : 'Entregue',
        minStatus: OrderStatus.Ready,
        timestamp: order.readyAt,
      },
    ];

    return steps.map(s => {
      const done = status >= s.minStatus;
      const active = status === s.minStatus;
      return { time: done ? toTime(s.timestamp) : '', label: s.label, done, active };
    });
  }

  // ── Timeline toggle ───────────────────────────────────
  toggleTimeline(): void { this.timelineCollapsed = !this.timelineCollapsed; }

  // Ao selecionar um pedido, sempre recolhe a timeline
  selectOrder(order: Order): void {
    if (this.selectedOrder?.id === order.id) {
      this.selectedOrder = null;
    } else {
      this.selectedOrder = order;
      this.timelineCollapsed = true;
    }
  }

  // ── Data de hoje para o topbar ───────────────────────
  get today(): string {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long',
    });
  }

  // ── Nº do pedido no restaurante (posição na lista) ───
  getOrderRank(order: Order): number {
    const idx = this.orders.findIndex(o => o.id === order.id);
    return idx === -1 ? 1 : idx + 1;
  }

  // ── Formata apenas HH:MM ─────────────────────────────
  formatTimeOnly(dateStr?: string): string {
    if (!dateStr) return '';
    const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    return new Date(str).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    });
  }

  // ── "Prepare em até X min" — tempo restante desde que entrou em preparo ──
  getPrepareUntilLabel(order: Order): string {
    // Usa preparingStartedAt como início; se não tiver, usa createdAt
    const startStr = order.preparingStartedAt ?? order.createdAt;
    if (!startStr || !order.estimatedDeliveryTimeInMinutes) {
      // Sem dados suficientes: mostra o total configurado
      return order.estimatedDeliveryTimeInMinutes
        ? `Prepare em até ${order.estimatedDeliveryTimeInMinutes} min`
        : 'Em preparo';
    }
    const start = new Date(startStr.endsWith('Z') ? startStr : startStr + 'Z');
    const deadline = new Date(start.getTime() + order.estimatedDeliveryTimeInMinutes * 60_000);
    const remaining = Math.ceil((deadline.getTime() - Date.now()) / 60_000);
    if (remaining <= 0) return 'Prazo encerrado';
    if (remaining === 1) return 'Prepare em até 1 min';
    return `Prepare em até ${remaining} min`;
  }

  // ── "Despachado há X min" para cards Em Rota — fallback para createdAt se onTheWayAt ausente ──
  getDispatchedAgo(order: Order): string {
    const dateStr = order.onTheWayAt ?? order.createdAt;
    if (!dateStr) return 'Despachado agora';
    const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    const dispatchedAt = new Date(str);
    const mins = Math.floor((Date.now() - dispatchedAt.getTime()) / 60_000);
    if (mins <= 0) return 'Despachado agora';
    if (mins === 1) return 'Despachado há 1 min';
    return `Despachado há ${mins} min`;
  }

  // ── Countdown de entrega ─────────────────────────────
  private getRemainingMinutes(order: Order): number | null {
    if (!order.estimatedDeliveryTimeInMinutes || !order.createdAt) return null;
    const str = order.createdAt.endsWith('Z') ? order.createdAt : order.createdAt + 'Z';
    const created = new Date(str);
    const eta = new Date(created.getTime() + order.estimatedDeliveryTimeInMinutes * 60_000);
    return Math.floor((eta.getTime() - Date.now()) / 60_000);
  }

  getTimerClass(order: Order): string {
    const mins = this.getRemainingMinutes(order);
    if (mins === null) return 'timer-green';
    if (mins < 0) return 'timer-late';
    if (mins <= 9) return 'timer-red';
    if (mins <= 19) return 'timer-yellow';
    return 'timer-green';
  }

  getDeliveryCountdown(order: Order): string {
    const mins = this.getRemainingMinutes(order);
    if (mins === null) return '';
    if (mins < 0) return 'Atrasado';
    if (mins === 0) return '< 1 min';
    return `${mins} min`;
  }

  // ── TrackBy ───────────────────────────────────────────
  trackByOrderId(_: number, order: Order): string { return order.id ?? ''; }
  trackByItemId(_: number, item: { id: string }): string { return item.id; }
}