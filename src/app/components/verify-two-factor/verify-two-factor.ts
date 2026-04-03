import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-verify-2fa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './verify-two-factor.html',
  styleUrls: ['./verify-two-factor.css']
})
export class VerifyTwoFactor {
  code = '';
  errorMessage = '';
  submitted = false;

  constructor(private http: HttpClient, private router: Router) {}

  verify() {
    this.submitted = true;
    this.errorMessage = '';

    const email = localStorage.getItem('pendingEmail');
    if (!email) {
      this.errorMessage = 'Sessão expirada. Faça login novamente.';
      return;
    }

    this.http.post<any>('https://localhost:44356/api/Users/verify-2fa', { email, code: this.code })
      .subscribe({
        next: (response) => {
          localStorage.removeItem('pendingEmail');
          localStorage.setItem('token', response.token);
          this.router.navigate(['/restaurant', response.restaurantId, 'orders']);
        },
        error: (err) => {
          this.submitted = false;
          if (err?.error?.errors) {
            this.errorMessage = err.error.errors.join(', ');
          } else {
            this.errorMessage = 'Código inválido ou expirado.';
          }
        }
      });
  }
}