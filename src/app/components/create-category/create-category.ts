import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { CategoryService } from '../../services/category.service';
import { Location } from '@angular/common';


@Component({
  selector: 'app-create-category',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-category.html',
  styleUrls: ['./create-category.css'],
})
export class CreateCategory {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private notification: NotificationService,
    private router: Router,
    private location: Location,
    private categoryService: CategoryService,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    });
  }

  goBack() {
    this.location.back();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.categoryService.create(this.form.value).subscribe({
      next: (response) => {
        this.notification.show(`Categoria ${response.name} criada com sucesso!`);

        this.router.navigate(['/list-products']);
      },
      error: () => {
        this.notification.show('Erro ao criar categoria');
      },
    });
  }
}
