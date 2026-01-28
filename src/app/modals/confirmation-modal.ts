import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from '../services/confirmation.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="cancel()">
      <div class="modal-content" (click)="$event.stopPropagation()" [class]="'type-' + type">
        <div class="modal-header">
          <div class="modal-icon" [class]="'icon-' + type">
            <svg *ngIf="type === 'danger'" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg *ngIf="type === 'warning'" viewBox="0 0 24 24" fill="none">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="17" r="1" fill="currentColor"/>
            </svg>
            <svg *ngIf="type === 'info'" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="8" r="1" fill="currentColor"/>
            </svg>
          </div>
          <h3>{{ title }}</h3>
        </div>
        
        <div class="modal-body">
          <p>{{ message }}</p>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-cancel" (click)="cancel()">
            {{ cancelText }}
          </button>
          <button class="btn btn-confirm" [class]="'btn-' + type" (click)="confirm()">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s;
    }

    @keyframes slideIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .modal-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-icon svg {
      width: 32px;
      height: 32px;
    }

    .icon-danger {
      background: #fee2e2;
      color: #dc2626;
    }

    .icon-warning {
      background: #fef3c7;
      color: #f59e0b;
    }

    .icon-info {
      background: #dbeafe;
      color: #3b82f6;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      text-align: center;
    }

    .modal-body {
      margin-bottom: 24px;
    }

    .modal-body p {
      margin: 0;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
      line-height: 1.5;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
    }

    .btn {
      flex: 1;
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-cancel:hover {
      background: #e5e7eb;
    }

    .btn-confirm {
      color: white;
    }

    .btn-danger {
      background: #dc2626;
    }

    .btn-danger:hover {
      background: #b91c1c;
    }

    .btn-warning {
      background: #f59e0b;
    }

    .btn-warning:hover {
      background: #d97706;
    }

    .btn-info {
      background: #3b82f6;
    }

    .btn-info:hover {
      background: #2563eb;
    }
  `]
})
export class ConfirmationModalComponent implements OnInit {
  isOpen = false;
  title = '';
  message = '';
  confirmText = 'Confirmar';
  cancelText = 'Cancelar';
  type: 'danger' | 'warning' | 'info' = 'warning';
  
  private currentState: any;

  constructor(private confirmationService: ConfirmationService) {}

  ngOnInit() {
    this.confirmationService.confirmation$.subscribe(state => {
      this.isOpen = state.isOpen;
      this.title = state.title;
      this.message = state.message;
      this.confirmText = state.confirmText || 'Confirmar';
      this.cancelText = state.cancelText || 'Cancelar';
      this.type = state.type || 'warning';
      this.currentState = state;
    });
  }

  confirm() {
    this.confirmationService.close(true, this.currentState);
  }

  cancel() {
    this.confirmationService.close(false, this.currentState);
  }
}