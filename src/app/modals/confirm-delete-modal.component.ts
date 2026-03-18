import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onCancel()">
      <div class="modal-content" (click)="$event.stopPropagation()">

        <div class="modal-icon">
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
            <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M9 6V4h6v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <h3 class="modal-title">Remover item?</h3>
        <p class="modal-subtitle" *ngIf="itemName">
          Tem certeza que deseja remover <strong>{{ itemName }}</strong> do carrinho?
        </p>
        <p class="modal-subtitle" *ngIf="!itemName">
          Tem certeza que deseja remover este item do carrinho?
        </p>

        <div class="modal-actions">
          <button class="btn-cancel" (click)="onCancel()">Cancelar</button>
          <button class="btn-confirm" (click)="onConfirm()">Sim, remover</button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.18s ease-out;
      padding-bottom: env(safe-area-inset-bottom);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .modal-content {
      background: #ffffff;
      border-radius: 16px 16px 0 0;
      width: 100%;
      max-width: 600px;
      padding: 2rem 1.5rem 2.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.75rem;
      animation: slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 -4px 30px rgba(0,0,0,0.12);
    }

    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }

    .modal-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: #fff0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #740300;
      margin-bottom: 0.25rem;
    }

    .modal-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #2e2e2e;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.875rem;
      color: #717171;
      margin: 0;
      line-height: 1.5;
    }

    .modal-subtitle strong {
      color: #2e2e2e;
      font-weight: 600;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      width: 100%;
      margin-top: 0.75rem;
    }

    .btn-cancel {
      flex: 1;
      padding: 0.875rem;
      background-color: #f5f5f5;
      color: #740300;
      border: 3px solid #740300;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-cancel:hover {
      background-color: #e8e8e8;
    }

    .btn-confirm {
      flex: 1;
      padding: 0.875rem;
      background-color: #740300;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .btn-confirm:hover {
      opacity: 0.88;
    }
  `]
})
export class ConfirmDeleteModalComponent {
  @Input() isOpen = false;
  @Input() itemName: string | null | undefined = null;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm() {
    this.confirmed.emit();
  }

  onCancel() {
    this.cancelled.emit();
  }
}