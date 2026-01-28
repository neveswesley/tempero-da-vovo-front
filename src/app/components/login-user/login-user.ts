import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule], // ⚠️ RouterModule
  templateUrl: './login-user.html',
  styleUrls: ['./login-user.css'],
})
export class LoginUser {
  email = '';
  password = '';
  showPassword = false;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  login() {
    this.errorMessage = '';

    const payload = {
      email: this.email,
      password: this.password,
    };

    this.http.post<any>('https://localhost:44356/api/Users/login', payload).subscribe({
      next: (response) => {
        console.log(response);

        if (response.success) localStorage.setItem('restaurantId', response.restaurantId);

        // Futuro: salvar JWT
        // localStorage.setItem('token', response.token);
        this.router.navigate(['/list-products']);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);

        if (err?.error?.errors && Array.isArray(err.error.errors)) {
          this.errorMessage = err.error.errors.join(' ');
        } else if (err.status === 401) {
          this.errorMessage = 'Email ou senha inválidos';
        } else {
          this.errorMessage = 'Erro ao realizar login';
        }

        this.cdr.detectChanges();
      },
    });
  }
}
