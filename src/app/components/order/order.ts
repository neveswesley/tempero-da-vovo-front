import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { Observable } from 'rxjs';
import { Order } from '../../models/order.models';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order.html',
})
export class OrderComponent implements OnInit {

  order$!: Observable<Order | null>;

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.order$ = this.orderService.order$;
  }
}