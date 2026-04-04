import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './confirm-email.html',
  styleUrls: ['./confirm-email.css']
})
export class ConfirmEmail {
  code = '';
  errorMessage = '';
  successMessage = '';
  submitted = false;

  constructor(private http: HttpClient, private router: Router) {}

  confirm() {
    this.submitted = true;
    this.errorMessage = '';

    const email = localStorage.getItem('pendingEmail');
    if (!email) {
      this.errorMessage = 'E-mail não encontrado. Refaça o cadastro.';
      return;
    }

    this.http.post(`${environment.apiUrl}/api/Users/confirm-email`, { email, code: this.code })
      .subscribe({
        next: () => {
          localStorage.removeItem('pendingEmail');
          this.router.navigate(['/']);
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