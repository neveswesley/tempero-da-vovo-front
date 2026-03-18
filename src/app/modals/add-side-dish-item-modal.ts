import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SideDishService } from '../services/side-dish.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-add-side-dish-item-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h2>Adicionar complemento</h2>
          <button class="close-btn" (click)="close()">×</button>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="modal-body">
            <div class="form-group">
              <label>Nome</label>
              <input formControlName="name" />
            </div>

            <div class="form-group">
              <label>Preço</label>
              <input type="number" formControlName="price" />
            </div>
          </div>

          <footer class="modal-footer">
            <button type="button" class="btn ghost" (click)="close()">Cancelar</button>

            <button type="submit" class="btn primary" [disabled]="form.invalid || loading">
              {{ loading ? 'Salvando...' : 'Salvar' }}
            </button>
          </footer>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
      }

      .modal-content {
        background: #fff;
        width: 420px;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        overflow: hidden;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #eee;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 18px;
      }

      .close-btn {
        border: none;
        background: none;
        font-size: 22px;
        cursor: pointer;
      }

      .modal-body {
        padding: 24px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
      }

      input {
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid #ccc;
        font-size: 14px;
      }

      input:focus {
        outline: none;
        border-color: #4f46e5;
      }

      .modal-footer {
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        padding: 16px 24px;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      .btn {
        padding: 10px 18px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        cursor: pointer;
      }

      .btn.primary {
        background: #4f46e5;
        color: white;
      }

      .btn.primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn.ghost {
        background: transparent;
      }
    `,
  ],
})
export class AddSideDishItemModalComponent {
  @Input() group!: any;
  @Output() closeModal = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private sideDishService: SideDishService,
    private notification: NotificationService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
    });
  }

  close() {
    this.closeModal.emit();
  }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;

    this.sideDishService
      .createSideDish({
        sideDishGroupId: this.group.id,
        name: this.form.value.name,
        unitPrice: this.form.value.price,
        quantity: this.form.value.quantity
      })
      .subscribe({
        next: () => {
          this.notification.show('Complemento adicionado');
          this.created.emit();
          this.close();
          this.loading = false;
        },
        error: () => {
          this.notification.show('Erro ao adicionar complemento');
          this.loading = false;
        },
      });
  }
}
