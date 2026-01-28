import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface NotificationItem {
  id: number;
  message: string;
  leaving: boolean;
  entering: boolean;
}


@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notifications: NotificationItem[] = [];
  private subject = new BehaviorSubject<NotificationItem[]>([]);
  notifications$ = this.subject.asObservable();

  private id = 0;

  show(message: string) {
  const item: NotificationItem = {
    id: ++this.id,
    message,
    leaving: false,
    entering: true
  };

  this.notifications.push(item);
  this.subject.next([...this.notifications]);

  setTimeout(() => {
    item.entering = false;
    this.subject.next([...this.notifications]);
  });

  setTimeout(() => this.removeById(item.id), 3000);
}

  removeById(id: number) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return;

    this.notifications[index].leaving = true;
    this.subject.next([...this.notifications]);

    setTimeout(() => {
      this.notifications = this.notifications.filter(n => n.id !== id);
      this.subject.next([...this.notifications]);
    }, 300);
  }
}
