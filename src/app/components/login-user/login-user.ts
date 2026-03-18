import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
  ) { }

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
        if (response.success) {
          localStorage.setItem('restaurantId', response.restaurantId);
          localStorage.setItem('token', response.token);
              console.log('token salvo:', response.token);
          this.router.navigate(['/restaurant', response.restaurantId, 'orders']);
        } else {
          this.errorMessage = 'Email ou senha inválidos';
        }
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
