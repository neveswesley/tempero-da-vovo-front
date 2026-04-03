import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '../../environments/environment';
import { SignalrService } from '../../services/signalr.service';
import {
  Order,
  OrderStatus,
  DeliveryMode,
  PaymentWay,
  TimelineEvent,
  CancellationReasonType,
  CanceledBy,
  CancellationRequestStatus,
} from '../../models/order.models';
import { OrderService } from '../../services/order.service';

interface CancelOrderRequestJson {
  clientSessionId: string;
  reason: CancellationReasonType;
  canceledBy: CanceledBy;
  description?: string;
}

interface ApproveCancellationRequestJson {
  cancellationReasonType: CancellationReasonType;
  cancellationReason: string;
}

interface RejectOrderRequestJson {
  reason: CancellationReasonType;
  description?: string;
}

interface RejectCancellationRequestJson {
  rejectReason: string;
}

@Component({
  selector: 'app-restaurant-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './restaurant-orders.html',
  styleUrls: ['./restaurant-orders.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantOrdersComponent implements OnInit, OnDestroy {
  // ── Estado principal ───────────────────────────────────────────
  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly now = signal(Date.now());

  // FIX: selectedOrder agora é computed derivado de selectedOrderId.
  // O effect() anterior causava loop infinito: lia selectedOrder() e
  // escrevia selectedOrder.set() no mesmo effect, travando a página
  // a cada update de orders() (novo pedido, mudança de status, etc).
  readonly selectedOrderId = signal<string | null>(null);
  readonly selectedOrder = computed(() =>
    this.orders().find(o => o.id === this.selectedOrderId()) ?? null
  );

  // ── Filtros ────────────────────────────────────────────────────
  readonly searchQuery = signal('');
  readonly statusFilter = signal<OrderStatus | ''>('');

  // ── UI toggles ─────────────────────────────────────────────────
  readonly timelineCollapsed = signal(false);
  readonly activeSection = signal<'orders' | 'menu' | 'finance' | 'settings'>('orders');
  readonly restaurantName = signal('Restaurante');

  private readonly _collapsedGroups = signal<Set<string>>(
    new Set(['new', 'preparing', 'onway', 'done', 'canceled', 'requests'])
  );

  // ── Modal cancelar ─────────────────────────────────────────────
  readonly showCancelModal = signal(false);
  readonly orderToCancel = signal<Order | null>(null);
  readonly cancellationReasonType = signal<CancellationReasonType>(CancellationReasonType.OutOfStock);
  readonly cancelDescription = signal('');
  readonly cancelError = signal('');

  // ── Modal rejeitar pedido (PendingConfirmation) ────────────────
  readonly showRejectModal = signal(false);
  readonly orderToReject = signal<Order | null>(null);
  readonly rejectReason = signal<CancellationReasonType>(CancellationReasonType.OutOfStock);
  readonly rejectDescription = signal('');
  readonly rejectError = signal('');

  // ── Modal aprovar solicitação de cancelamento ──────────────────
  readonly showApproveCancelModal = signal(false);
  readonly approveCancelReason = signal<CancellationReasonType>(CancellationReasonType.OutOfStock);
  readonly approveCancelDescription = signal('');
  readonly approveCancelError = signal('');

  // ── Modal recusar solicitação de cancelamento ──────────────────
  readonly showRejectCancelModal = signal(false);
  readonly rejectCancelReason = signal('');
  readonly rejectCancelError = signal('');
  readonly orderToCancellationAction = signal<Order | null>(null);

  // ── Modal feedback ─────────────────────────────────────────────
  readonly showFeedbackModal = signal(false);
  readonly feedbackSuccess = signal(false);

  // ── Derivados ──────────────────────────────────────────────────
  readonly filteredOrders = computed(() => {
    let result = this.orders();

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      result = result.filter(o =>
        String(o.orderNumber).includes(q) ||
        (o.customerName ?? '').toLowerCase().includes(q)
      );
    }

    const sf = this.statusFilter();
    if (sf !== '') {
      result = result.filter(o => o.status === sf);
    }

    return result;
  });

  readonly pendingOrders = computed(() =>
    this.filteredOrders().filter(o => this.getStatus(o) === OrderStatus.PendingConfirmation)
  );

  readonly preparingOrders = computed(() =>
    this.filteredOrders().filter(o => this.getStatus(o) === OrderStatus.Preparing)
  );

  readonly onTheWayOrders = computed(() =>
    this.filteredOrders().filter(o => this.getStatus(o) === OrderStatus.OnTheWay)
  );

  readonly readyOrders = computed(() =>
    this.filteredOrders().filter(o => this.getStatus(o) === OrderStatus.Ready)
  );

  readonly canceledOrders = computed(() =>
    this.filteredOrders().filter(o => this.getStatus(o) === OrderStatus.Canceled)
  );

  readonly cancellationRequestedOrders = computed(() =>
    this.filteredOrders().filter(o => this.getStatus(o) === OrderStatus.CancellationRequested)
  );

  readonly pendingCount = computed(() => this.pendingOrders().length);

  // ── Enums expostos ao template ─────────────────────────────────
  OrderStatus = OrderStatus;
  DeliveryMode = DeliveryMode;
  PaymentWay = PaymentWay;
  CancellationReasonType = CancellationReasonType;
  CancellationRequestStatus = CancellationRequestStatus;

  statusLabel: Record<OrderStatus, string> = {
    [OrderStatus.Draft]: 'Pedido criado',
    [OrderStatus.PendingConfirmation]: 'Aguardando confirmação',
    [OrderStatus.Preparing]: 'Em preparo',
    [OrderStatus.OnTheWay]: 'Saiu para entrega',
    [OrderStatus.Ready]: 'Pronto',
    [OrderStatus.CancellationRequested]: 'Cancelamento solicitado',
    [OrderStatus.Canceled]: 'Cancelado',
    [OrderStatus.Abandoned]: 'Abandonado',
  };

  private readonly advanceLabels: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.PendingConfirmation]: 'Confirmar pedido →',
    [OrderStatus.Preparing]: 'Despachar →',
  };

  todayLabel = (() => {
    const text = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(new Date());
    return text.charAt(0).toUpperCase() + text.slice(1);
  })();

  private restaurantId = '';
  private newOrderAudio: HTMLAudioElement | null = null;
  private uiTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private http: HttpClient,
    private orderService: OrderService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private signalrService: SignalrService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    // FIX: effect() removido. Era a causa principal do travamento.
    // selectedOrder agora é um computed puro (ver acima), que sempre
    // reflete o objeto atualizado de orders() sem precisar de effect.
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const params =
      this.route.snapshot.params['restaurantId'] ??
      this.route.snapshot.parent?.params['restaurantId'];

    this.restaurantId = params ?? '';

    if (!this.restaurantId) {
      this.error.set('RestaurantId não encontrado na rota.');
      this.loading.set(false);
      return;
    }

    this.loadRestaurantInfo();
    await this.initializeSignalR();
    this.loadOrders();
    this.startUiTimer();
  }

  async ngOnDestroy(): Promise<void> {
    this.stopUiTimer();

    if (isPlatformBrowser(this.platformId) && this.restaurantId) {
      try {
        await this.signalrService.leaveRestaurantGroup(this.restaurantId);
      } catch (error: unknown) {
        console.error('Erro ao sair do grupo do restaurante', error);
      }
    }

    this.signalrService.offOrderCreated();
    this.signalrService.offOrderUpdated();
    this.stopNewOrderSound();
  }

  // ── Inicialização ──────────────────────────────────────────────

  loadRestaurantInfo(): void {
    this.http
      .get<any>(`${environment.apiUrl}/api/Restaurants/${this.restaurantId}`)
      .subscribe({
        next: (restaurant) => this.restaurantName.set(restaurant.name),
        error: () => this.restaurantName.set('Restaurante'),
      });
  }

  private async initializeSignalR(): Promise<void> {
    try {
      await this.signalrService.start();
      await this.signalrService.joinRestaurantGroup(this.restaurantId);

      this.signalrService.offOrderCreated();
      this.signalrService.offOrderUpdated();

      this.signalrService.onOrderCreated((payload: unknown) => {
        this.collapsedGroupsUpdate(g => g.delete('new'));
        this.playNewOrderSound();

        const createdOrder = this.extractOrderFromPayload(payload);

        if (createdOrder?.id) {
          this.http
            .get<Order>(`${environment.apiUrl}/api/Orders/${createdOrder.id}`)
            .subscribe({
              next: (fullOrder) => this.upsertOrder(fullOrder),
              error: () => this.loadOrders(),
            });
          return;
        }

        this.loadOrders();
      });

      this.signalrService.onOrderUpdated((payload: unknown) => {
        const updatedOrder = this.extractOrderFromPayload(payload);

        if (updatedOrder?.id) {
          this.upsertOrder(updatedOrder);
          return;
        }

        this.loadOrders();
      });
    } catch (error: unknown) {
      console.error('Erro ao inicializar SignalR', error);
    }
  }

  // ── Timer de UI ────────────────────────────────────────────────

  private startUiTimer(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.stopUiTimer();

    this.uiTimer = setInterval(() => {
      this.now.set(Date.now());
    }, 5000);
  }

  private stopUiTimer(): void {
    if (this.uiTimer) {
      clearInterval(this.uiTimer);
      this.uiTimer = null;
    }
  }

  // ── Grupos colapsáveis ─────────────────────────────────────────

  private collapsedGroupsUpdate(fn: (s: Set<string>) => void): void {
    const next = new Set(this._collapsedGroups());
    fn(next);
    this._collapsedGroups.set(next);
  }

  toggleGroup(group: string): void {
    this.collapsedGroupsUpdate(s => {
      if (s.has(group)) s.delete(group);
      else s.add(group);
    });
  }

  isGroupCollapsed(group: string): boolean {
    return this._collapsedGroups().has(group);
  }

  // ── Carregamento de pedidos ────────────────────────────────────

  loadOrders(): void {
    if (!this.restaurantId) return;

    this.loading.set(true);
    this.error.set(null);

    this.http
      .get<Order[]>(
        `${environment.apiUrl}/api/Orders/orders-by-restaurant/${this.restaurantId}`,
      )
      .subscribe({
        next: (orders: Order[]) => {
          this.orders.set(this.normalizeOrders(orders));
          this.loading.set(false);
        },
        error: (err: unknown) => {
          console.error('Erro ao carregar pedidos', err);
          this.error.set('Erro ao carregar pedidos.');
          this.loading.set(false);
        },
      });
  }

  private normalizeOrders(orders: Order[]): Order[] {
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;

    return orders
      .filter(o => o.status !== OrderStatus.Draft)
      .filter(o => {
        if (!o.createdAt) return true;
        const str = o.createdAt.endsWith('Z') ? o.createdAt : `${o.createdAt}Z`;
        return new Date(str).getTime() >= twelveHoursAgo;
      });
  }

  private shouldKeepOrder(order: Order): boolean {
    if (order.status === OrderStatus.Draft) return false;
    if (!order.createdAt) return true;

    const str = order.createdAt.endsWith('Z') ? order.createdAt : `${order.createdAt}Z`;
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;

    return new Date(str).getTime() >= twelveHoursAgo;
  }

  private upsertOrder(order: Order): void {
    if (!this.shouldKeepOrder(order)) {
      this.removeOrder(order.id ?? '');
      return;
    }

    this.orders.update(list => {
      const index = list.findIndex(o => o.id === order.id);

      if (index === -1) {
        return [order, ...list];
      }

      const existing = list[index];

      // FIX: só cria novo objeto (e dispara re-render) se algo realmente mudou.
      // Antes, o spread sempre criava uma nova referência, invalidando todos os
      // computeds dependentes mesmo sem mudança real.
      if (
        existing.status === order.status &&
        existing.cancellationRequestStatus === order.cancellationRequestStatus
      ) {
        return list;
      }

      const next = [...list];
      next[index] = { ...existing, ...order };
      return next;
    });
  }

  private removeOrder(orderId: string): void {
    if (!orderId) return;
    this.orders.update(list => list.filter(o => o.id !== orderId));
  }

  private extractOrderFromPayload(payload: unknown): Order | null {
    if (!payload || typeof payload !== 'object') return null;

    const p = payload as any;

    // Normaliza orderId → id
    if (!p.id && p.orderId) p.id = p.orderId;

    if (p.id && p.status !== undefined) return p as Order;
    if (p.order?.id && p.order?.status !== undefined) return p.order as Order;
    if (p.data?.id && p.data?.status !== undefined) return p.data as Order;

    return null;
  }

  // ── Filtros ────────────────────────────────────────────────────

  onSearch(value: string): void {
    this.searchQuery.set(value);
  }

  onFilter(value: OrderStatus | ''): void {
    this.statusFilter.set(value);
  }

  // ── Seleção de pedido ──────────────────────────────────────────

  selectOrder(order: Order): void {
    if (this.selectedOrderId() === order.id) {
      this.selectedOrderId.set(null);
    } else {
      this.selectedOrderId.set(order.id ?? null);
      this.timelineCollapsed.set(true);
    }
  }

  // ── Avançar status ─────────────────────────────────────────────

  advanceStatus(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.stopNewOrderSound();

    const current = this.getStatus(order);
    const nextMap: Partial<Record<OrderStatus, OrderStatus>> = {
      [OrderStatus.PendingConfirmation]: OrderStatus.Preparing,
      [OrderStatus.Preparing]: OrderStatus.OnTheWay,
      [OrderStatus.OnTheWay]: OrderStatus.Ready,
    };

    const next = nextMap[current];
    if (!next) return;

    this.updateOrderStatus(order.id ?? '', next);

    this.http
      .put(`${environment.apiUrl}/api/Orders/change-order-status/${order.id}`, {})
      .subscribe({
        error: (err: unknown) => {
          console.error('Erro ao avançar status', err);
          this.updateOrderStatus(order.id ?? '', current);
        },
      });
  }

  getAdvanceLabel(order: Order): string {
    const current = this.getStatus(order);

    if (order.deliveryMode === DeliveryMode.Pickup && current === OrderStatus.Preparing) {
      return 'Pronto p/ retirada →';
    }

    return this.advanceLabels[current] ?? 'Avançar →';
  }

  printOrder(order: Order): void {
    console.log('Imprimir pedido', order.orderNumber);
    window.print();
  }

  // ── Cancelar pedido ────────────────────────────────────────────

  cancelOrder(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.orderToCancel.set(order);
    this.cancellationReasonType.set(CancellationReasonType.OutOfStock);
    this.cancelDescription.set('');
    this.cancelError.set('');
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
    this.orderToCancel.set(null);
    this.cancelError.set('');
  }

  confirmCancel(): void {
    const order = this.orderToCancel();
    if (!order) return;

    const orderId = order.id ?? '';
    const body: CancelOrderRequestJson = {
      clientSessionId: '',
      reason: this.cancellationReasonType(),
      canceledBy: CanceledBy.Restaurant,
      description: this.cancelDescription() || undefined,
    };

    this.stopNewOrderSound();

    this.http
      .put(`${environment.apiUrl}/api/Orders/cancel-order-by-restaurant/${orderId}`, body)
      .pipe(
        catchError((error: unknown) => {
          console.error('Erro ao cancelar pedido', error);
          this.closeCancelModal();
          this.feedbackSuccess.set(false);
          this.showFeedbackModal.set(true);
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.updateOrderStatus(orderId, OrderStatus.Canceled);
        this.closeCancelModal();
        this.feedbackSuccess.set(true);
        this.showFeedbackModal.set(true);
      });
  }

  // ── Rejeitar pedido ────────────────────────────────────────────

  rejectOrder(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.orderToReject.set(order);
    this.rejectReason.set(CancellationReasonType.OutOfStock);
    this.rejectDescription.set('');
    this.rejectError.set('');
    this.showRejectModal.set(true);
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.orderToReject.set(null);
    this.rejectError.set('');
  }

  confirmReject(): void {
    const order = this.orderToReject();
    if (!order) return;

    const orderId = order.id ?? '';
    const body: RejectOrderRequestJson = {
      reason: this.rejectReason(),
      description: this.rejectDescription() || undefined,
    };

    this.stopNewOrderSound();

    this.http
      .put<void>(`${environment.apiUrl}/api/Orders/${orderId}/reject-order`, body)
      .pipe(
        catchError((error: unknown) => {
          console.error('Erro ao rejeitar pedido', error);
          this.closeRejectModal();
          this.feedbackSuccess.set(false);
          this.showFeedbackModal.set(true);
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.updateOrderStatus(orderId, OrderStatus.Canceled);
        this.closeRejectModal();
        this.feedbackSuccess.set(true);
        this.showFeedbackModal.set(true);
      });
  }

  // ── Aprovar solicitação de cancelamento ────────────────────────

  approveCancellation(order: Order, event?: Event): void {
    event?.stopPropagation();

    const orderId = order.id ?? '';
    const body: ApproveCancellationRequestJson = {
      cancellationReasonType: this.approveCancelReason(),
      cancellationReason: this.approveCancelDescription() || '',
    };

    this.orderService
      .approveCancellationRequest(orderId, body)
      .pipe(
        catchError((error: unknown) => {
          console.error('Erro ao aprovar cancelamento', error);
          this.feedbackSuccess.set(false);
          this.showFeedbackModal.set(true);
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.updateOrderStatus(orderId, OrderStatus.Canceled);
        this.feedbackSuccess.set(true);
        this.showFeedbackModal.set(true);
      });
  }

  // ── Recusar solicitação de cancelamento ────────────────────────

  openRejectCancelModal(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.orderToCancellationAction.set(order);
    this.rejectCancelReason.set('');
    this.rejectCancelError.set('');
    this.showRejectCancelModal.set(true);
  }

  closeRejectCancelModal(): void {
    this.showRejectCancelModal.set(false);
    this.orderToCancellationAction.set(null);
    this.rejectCancelReason.set('');
    this.rejectCancelError.set('');
  }

  confirmDenyCancellation(): void {
    const order = this.orderToCancellationAction();
    if (!order) return;

    const orderId = order.id ?? '';
    const body: RejectCancellationRequestJson = {
      rejectReason: this.rejectCancelReason(),
    };

    this.orderService
      .rejectCancellationRequest(orderId, body)
      .pipe(
        catchError((error: unknown) => {
          console.error('Erro ao recusar cancelamento', error);
          this.rejectCancelError.set('Não foi possível recusar o cancelamento. Tente novamente.');
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.closeRejectCancelModal();

        this.orders.update(list =>
          list.map(o =>
            o.id === orderId
              ? {
                ...o,
                cancellationRequestStatus: CancellationRequestStatus.Rejected,
              }
              : o
          )
        );
      });
  }

  // ── Feedback modal ─────────────────────────────────────────────

  closeFeedbackModal(): void {
    this.showFeedbackModal.set(false);
  }

  // ── Timeline ───────────────────────────────────────────────────

  toggleTimeline(): void {
    this.timelineCollapsed.update(v => !v);
  }

  getTimeline(order: Order): TimelineEvent[] {
    const toTime = (dateStr?: string): string => {
      if (!dateStr) return '';
      const s = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
      return new Date(s).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });
    };

    const createdAtStr = order.createdAt
      ? order.createdAt.endsWith('Z') ? order.createdAt : `${order.createdAt}Z`
      : undefined;

    const status = this.getStatus(order);
    const isPickup = order.deliveryMode === DeliveryMode.Pickup;

    const steps: { label: string; minStatus: OrderStatus; timestamp?: string }[] = [
      { label: 'Pedido realizado', minStatus: OrderStatus.PendingConfirmation, timestamp: createdAtStr },
      { label: 'Em preparo', minStatus: OrderStatus.Preparing, timestamp: order.preparingStartedAt },
      { label: isPickup ? 'Pronto para retirada' : 'Saiu para entrega', minStatus: OrderStatus.OnTheWay, timestamp: order.onTheWayAt },
      { label: isPickup ? 'Retirado' : 'Entregue', minStatus: OrderStatus.Ready, timestamp: order.readyAt },
    ];

    return steps.map((s, index) => {
      const isLast = index === steps.length - 1;
      const reached = status >= s.minStatus;

      // Último step (Entregue/Retirado): done=true quando Ready, sem active.
      // Demais steps: done quando já passou, active quando é o atual.
      // Isso evita que done e active sejam true ao mesmo tempo, o que fazia
      // o CSS de .active (vermelho) sobrescrever o .done (verde) no último dot.
      const done = isLast ? reached : status > s.minStatus;
      const active = isLast ? false : status === s.minStatus;

      return {
        time: reached ? toTime(s.timestamp) : '',
        label: s.label,
        done,
        active,
      };
    });
  }

  // ── Helpers de tempo / exibição ────────────────────────────────

  getStatusLabel(status?: OrderStatus): string {
    if (!status) return '';

    switch (status) {
      case OrderStatus.PendingConfirmation: return 'Aguardando confirmação';
      case OrderStatus.Preparing: return 'Em preparo';
      case OrderStatus.OnTheWay: return 'Em rota';
      case OrderStatus.Ready: return 'Concluído';
      case OrderStatus.Canceled: return 'Cancelado';
      case OrderStatus.CancellationRequested: return 'Cancelamento solicitado';
      case OrderStatus.Abandoned: return 'Abandonado';
      default: return '';
    }
  }

  abbreviateName(fullName: string | undefined): string {
    if (!fullName) return 'Cliente';

    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0];

    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
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

    const str = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
    const d = new Date(str);

    return (
      d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) +
      ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    );
  }

  formatTimeOnly(dateStr?: string): string {
    if (!dateStr) return '';

    const str = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;

    return new Date(str).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  }

  getEstimatedDeliveryWindow(order: Order): string {
    if (!order.estimatedDeliveryTimeInMinutes || !order.createdAt) return '';

    const str = order.createdAt.endsWith('Z') ? order.createdAt : `${order.createdAt}Z`;
    const created = new Date(str);

    const min = new Date(created.getTime() + order.estimatedDeliveryTimeInMinutes * 60_000);
    const max = new Date(created.getTime() + (order.estimatedDeliveryTimeInMinutes + 10) * 60_000);

    const fmt = (d: Date) =>
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

    return `${fmt(min)} – ${fmt(max)}`;
  }

  getPrepareUntilLabel(order: Order): string {
    const startStr = order.preparingStartedAt ?? order.createdAt;

    if (!startStr || !order.estimatedDeliveryTimeInMinutes) {
      return order.estimatedDeliveryTimeInMinutes
        ? `Prepare em até ${order.estimatedDeliveryTimeInMinutes} min`
        : 'Em preparo';
    }

    const start = new Date(startStr.endsWith('Z') ? startStr : `${startStr}Z`);
    const deadline = new Date(start.getTime() + order.estimatedDeliveryTimeInMinutes * 60_000);
    const remaining = Math.ceil((deadline.getTime() - this.now()) / 60_000);

    if (remaining <= 0) return 'Prazo encerrado';
    if (remaining === 1) return 'Prepare em até 1 min';

    return `Prepare em até ${remaining} min`;
  }

  getDispatchedAgo(order: Order): string {
    const dateStr = order.onTheWayAt ?? order.createdAt;
    if (!dateStr) return 'Despachado agora';

    const str = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
    const mins = Math.floor((this.now() - new Date(str).getTime()) / 60_000);

    if (mins <= 0) return 'Despachado agora';
    if (mins === 1) return 'Despachado há 1 min';

    return `Despachado há ${mins} min`;
  }

  private getRemainingMinutes(order: Order): number | null {
    if (!order.estimatedDeliveryTimeInMinutes || !order.createdAt) return null;

    const str = order.createdAt.endsWith('Z') ? order.createdAt : `${order.createdAt}Z`;
    const created = new Date(str);
    const eta = new Date(created.getTime() + order.estimatedDeliveryTimeInMinutes * 60_000);

    return Math.floor((eta.getTime() - this.now()) / 60_000);
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

  getAcceptCountdown(order: Order): string {
    const baseDate = order.pendingConfirmationAt ?? order.createdAt;
    if (!baseDate) return '';

    const str = baseDate.endsWith('Z') ? baseDate : `${baseDate}Z`;
    const deadline = new Date(new Date(str).getTime() + 8 * 60_000);
    const diff = deadline.getTime() - this.now();
    const mins = Math.floor(diff / 60_000);
    const secs = Math.floor((diff % 60_000) / 1000);

    if (diff <= 0) return 'Expirado';
    if (mins === 0) return `${secs}s`;

    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  getAcceptTimerClass(order: Order): string {
    const baseDate = order.pendingConfirmationAt ?? order.createdAt;
    if (!baseDate) return 'timer-green';

    const str = baseDate.endsWith('Z') ? baseDate : `${baseDate}Z`;
    const deadline = new Date(new Date(str).getTime() + 8 * 60_000);
    const diff = deadline.getTime() - this.now();
    const mins = Math.floor(diff / 60_000);

    if (diff <= 0) return 'timer-late';
    if (mins <= 2) return 'timer-red';
    if (mins <= 4) return 'timer-yellow';

    return 'timer-green';
  }

  getOrderRank(order: Order): number {
    const idx = this.orders().findIndex(o => o.id === order.id);
    return idx === -1 ? 1 : idx + 1;
  }

  get today(): string {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  }

  trackByOrderId(_: number, order: Order): string {
    return order.id ?? '';
  }

  trackByItemId(_: number, item: { id: string }): string {
    return item.id;
  }

  // ── Áudio ──────────────────────────────────────────────────────

  private playNewOrderSound(): void {
    if (this.newOrderAudio) return;

    this.newOrderAudio = new Audio('audio/new_order_notification.mp3');
    this.newOrderAudio.loop = true;
    this.newOrderAudio.play().catch(err => console.warn('Erro ao tocar som:', err));
  }

  private stopNewOrderSound(): void {
    if (!this.newOrderAudio) return;

    this.newOrderAudio.pause();
    this.newOrderAudio.currentTime = 0;
    this.newOrderAudio = null;
  }

  // ── Mutação de estado interno ──────────────────────────────────

  private updateOrderStatus(id: string, status: OrderStatus): void {
    this.orders.update(list =>
      list.map(o => (o.id === id ? { ...o, status } : o))
    );
  }

  // ── Cards computados ───────────────────────────────────────────
  // FIX: os valores que dependem de now() (acceptCountdown, acceptTimerClass,
  // prepareLabel, dispatchedAgo) foram REMOVIDOS daqui e são chamados
  // diretamente no template via métodos. Isso evita que todos os cards
  // sejam recalculados a cada tick do timer (a cada 5s), o que causava
  // jank/travamento perceptível com muitos pedidos na tela.

  readonly pendingCards = computed(() =>
    this.pendingOrders().map(order => ({
      order,
      customerShortName: this.abbreviateName(order.customerName) || 'Cliente',
      statusLabel: this.getStatusLabel(order.status),
    }))
  );

  readonly preparingCards = computed(() =>
    this.preparingOrders().map(order => ({
      order,
      customerShortName: this.abbreviateName(order.customerName) || 'Cliente',
      timeOnly: this.formatTimeOnly(order.pendingConfirmationAt),
    }))
  );

  readonly onTheWayCards = computed(() =>
    this.onTheWayOrders().map(order => ({
      order,
      customerShortName: this.abbreviateName(order.customerName) || 'Cliente',
      timeOnly: this.formatTimeOnly(order.pendingConfirmationAt),
    }))
  );

  readonly cancellationRequestCards = computed(() =>
    this.cancellationRequestedOrders().map(order => ({
      order,
      customerShortName: this.abbreviateName(order.customerName) || 'Cliente',
      timeOnly: this.formatTimeOnly(order.pendingConfirmationAt),
    }))
  );

  readonly readyCards = computed(() =>
    this.readyOrders().map(order => ({
      order,
      customerShortName: this.abbreviateName(order.customerName) || 'Cliente',
      timeOnly: this.formatTimeOnly(order.pendingConfirmationAt),
    }))
  );

  readonly canceledCards = computed(() =>
    this.canceledOrders().map(order => ({
      order,
      customerShortName: this.abbreviateName(order.customerName) || 'Cliente',
      timeOnly: this.formatTimeOnly(order.pendingConfirmationAt),
      statusLabel: this.getStatusLabel(order.status),
    }))
  );

  trackByCardOrderId = (_: number, card: { order: Order }): string => card.order.id ?? '';
}