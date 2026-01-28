import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoryService } from '../services/category.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-edit-category-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Editar Categoria</h2>
          <button class="close-button" (click)="close()">×</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-group">
            <label>Nome da categoria</label>
            <input 
              type="text" 
              formControlName="name"
              placeholder="Ex: Sobremesas"
              [class.error]="form.get('name')?.invalid && form.get('name')?.touched"
            />
            <small class="error-message" *ngIf="form.get('name')?.invalid && form.get('name')?.touched">
              O nome da categoria é obrigatório
            </small>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" (click)="close()">
              Cancelar
            </button>
            <button 
              type="submit" 
              class="btn-save"
              [disabled]="form.invalid || isSubmitting"
            >
              {{ isSubmitting ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
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
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 20px;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(30px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 24px 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 32px;
      color: #666;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
      padding: 0;
      line-height: 1;
    }

    .close-button:hover {
      background-color: #f5f5f5;
    }

    form {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      font-size: 14px;
      color: #333;
    }

    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    input:focus {
      border-color: #740300;
      box-shadow: 0 0 0 1px rgba(116, 3, 0, 0.2);
    }

    input.error {
      border-color: #f44336;
    }

    .error-message {
      display: block;
      color: #f44336;
      font-size: 12px;
      margin-top: 4px;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    button {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-cancel {
      background-color: #f5f5f5;
      color: #666;
    }

    .btn-cancel:hover {
      background-color: #e0e0e0;
    }

    .btn-save {
      background-color: #740300;
      color: white;
    }

    .btn-save:hover:not(:disabled) {
      background-color: #5a0200;
    }

    .btn-save:disabled {
      background-color: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }
  `]
})
export class EditCategoryModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() category: any = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() categoryUpdated = new EventEmitter<void>();

  form: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private notificationService: NotificationService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required]
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['category'] && this.category) {
      this.form.patchValue({
        name: this.category.categoryName
      });
    }
  }

  close() {
    this.closeModal.emit();
    this.form.reset();
  }

  submit() {
    if (this.form.invalid || !this.category) return;

    this.isSubmitting = true;

    const data = {
      name: this.form.value.name
    };

    this.categoryService.update(this.category.categoryId, data).subscribe({
      next: () => {
        this.notificationService.show('Cardápio atualizado com sucesso');
        this.categoryUpdated.emit();
        this.close();
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Erro ao atualizar categoria:', error);
        this.notificationService.show('Erro ao atualizar categoria.');
        this.isSubmitting = false;
      }
    });
  }
}