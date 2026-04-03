export interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  data: T[];
}

export interface Order {
  id?: string;
  customerName?: string;
  customerPhone?: string;
  restaurantId?: string;
  clientSessionId?: string;
  items: OrderItem[];
  total: number;
  orderNumber?: number;
  createdAt?: string;
  status?: OrderStatus;
  subTotal?: number;
  deliveryFee?: number | null;
  deliveryMode?: DeliveryMode;
  street?: string;
  number?: string;
  complement?: string;
  reference?: string;
  neighborhood?: string;
  city?: string;
  estimatedDeliveryTimeInMinutes: number;
  paymentWay?: PaymentWay | null;
  payment?: PaymentInfo;
  pendingConfirmationAt?: string;
  preparingStartedAt?: string;
  onTheWayAt?: string;
  readyAt?: string;
  canceledAt?: string;
  cancellationReason?: string;
  cancellationRequestStatus?: CancellationRequestStatus;

}

export enum CancellationRequestStatus {
  None = 0,
  Pending = 1,
  Approved = 2,
  Rejected = 3
}


export interface PaymentInfo {
  paymentWay: PaymentWay;
  total: number;
  amountPaid?: number;
  change?: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  observation?: string;
  sideDishes: OrderItemSideDish[];
}

export interface OrderItemSideDish {
  sideDishId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  groupName?: string;
}

export interface OrderSideDish {
  sideDishId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface TimelineEvent {
  time: string;
  label: string;
  done: boolean;
  active: boolean;
}

export enum OrderStatus {
  Draft = 0,
  PendingConfirmation = 1,
  Preparing = 2,
  OnTheWay = 3,
  Ready = 4,
  CancellationRequested = 5,
  Canceled = 6,
  Abandoned = 99
}

export enum DeliveryMode {
  Delivery = 0,
  Pickup = 1,
}

export enum PaymentWay {
  Pix = 0,
  Cash = 1,
  Card = 2,
}

export enum CancellationReasonType {
  // Cliente
  ChangedMind = 0,           // Mudou de ideia
  WrongAddress = 1,          // Endereço errado
  OrderMistake = 2,          // Pedido feito por engano
  DelayTooLong = 3,          // Tempo de espera muito longo
  PaymentIssue = 4,          // Problema no pagamento
  HighDeliveryFee = 5,       // Valor do frete muito alto
  DelayedOrder = 6,          // Pedido atrasado
  Other = 7,                 // Outro

  // Restaurante
  OutOfStock = 8,            // Produto indisponível
  IngredientUnavailable = 9, // Falta de ingrediente
  MenuError = 10,            // Erro no cardápio
  StoreClosing = 11,         // Restaurante fechado
  OutOfDeliveryArea = 12,    // Área fora de entrega
  NoCourierAvailable = 13,   // Sem entregador disponível
  SystemError = 14,          // Erro no sistema
  FraudSuspicion = 15,       // Suspeita de fraude
  DuplicateOrder = 16,       // Pedido duplicado
  PaymentNotApproved = 17,   // Pagamento não aprovado
}

export enum CanceledBy {
  Restaurant = 0,
  Customer = 1,
  System = 2
}

export interface CancelOrderRequest {
  orderId: string;
  clientSessionId: string;
  reason: CancellationReasonType;
  description: string;
}