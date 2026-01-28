import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

interface ConfirmationData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmationState extends ConfirmationData {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  private confirmationSubject = new Subject<ConfirmationState>();
  public confirmation$ = this.confirmationSubject.asObservable();

  confirm(data: ConfirmationData): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmationSubject.next({
        ...data,
        isOpen: true,
        confirmText: data.confirmText || 'Confirmar',
        cancelText: data.cancelText || 'Cancelar',
        type: data.type || 'warning',
        resolve
      });
    });
  }

  close(result: boolean, state: ConfirmationState) {
    if (state.resolve) {
      state.resolve(result);
    }
    this.confirmationSubject.next({ ...state, isOpen: false });
  }
}