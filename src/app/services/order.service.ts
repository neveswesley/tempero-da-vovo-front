import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CancellationReasonType, CancelOrderRequest, Order, OrderItem, PaginatedResponse } from '../models/order.models';
import { AddItemToOrderRequest } from '../models/add-item-to-order.request';
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  if (!token) return next(req);

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });

  return next(cloned);
};

export interface OrderResponseJson {
  orderId: string;
  subTotal: number;
  total: number;
  itemsCount: number;
}

@Injectable({ providedIn: 'root' })
export class OrderService {

  private readonly apiUrl = 'https://localhost:44356/api/Orders';

  private orderSubject = new BehaviorSubject<Order | null>(null);
  order$ = this.orderSubject.asObservable();

  constructor(private http: HttpClient) { }

  addItem(payload: AddItemToOrderRequest): Observable<OrderResponseJson> {
    return this.http.post<OrderResponseJson>(`${this.apiUrl}/add-item`, payload).pipe(
      tap(response => {
        const restaurantId = payload.restaurantId;
        const clientSessionId = payload.clientSessionId;
        this.getCurrentOrder(restaurantId, clientSessionId).subscribe();
      })
    );
  }

  abandonOrder(orderId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/abandon/${orderId}`, {});
  }

  updateOrderItem(orderItemId: string, payload: {
    quantity: number;
    observation?: string;
    sideDishes: { sideDishId: string; quantity: number }[];
  }): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/update-order-item/${orderItemId}`, payload);
  }

  private updateLocalOrder(updatedItem: OrderItem) {
    const order = this.orderSubject.value;
    if (!order) return;

    const items = order.items.map(item =>
      item.id === updatedItem.id ? { ...updatedItem } : item
    );

    const total = items.reduce((acc, i) => acc + i.total, 0);

    this.orderSubject.next({
      ...order,
      items,
      total
    });
  }

  getCurrentOrder(restaurantId: string, clientSessionId: string) {
    return this.http
      .get<Order | null>(`${this.apiUrl}/current`, {
        params: { restaurantId, clientSessionId }
      })
      .pipe(
        tap(order => {
          if (!order) {
            this.orderSubject.next(null);
            return;
          }
          this.orderSubject.next({
            ...order,
            items: order.items ?? []
          });
        })
      );
  }

  getOrdersBySession(clientSessionId: string): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/orders/${clientSessionId}`);
  }

  removeOrderItem(orderItemId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-order-item/${orderItemId}`);
  }

  clearOrder() {
    this.orderSubject.next(null);
  }

  get snapshot(): Order | null {
    return this.orderSubject.value;
  }

  removeAllItems(orderId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/remove-all-order-item/${orderId}`);
  }

  cancelOrder(request: CancelOrderRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/cancel-order/${request.orderId}`, request);
  }

  getOrderHistory(
    restaurantId: string,
    page: number = 1,
    pageSize: number = 20
  ): Observable<PaginatedResponse<Order>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<PaginatedResponse<Order>>(
      `${this.apiUrl}/history/${restaurantId}`,
      { params }
    );
  }

  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`);
  }

  markAsDelivered(orderId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/mark-as-delivered/${orderId}`, {});
  }

  approveCancellationRequest(orderId: string, body: {
    cancellationReasonType: CancellationReasonType;
    cancellationReason: string;
  }): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${orderId}/cancel/approve/`, body);
  }

  rejectCancellationRequest(orderId: string, body: {
    rejectReason: string;
  }): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${orderId}/cancel/reject/`, body);
  }
}