import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-user-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './register-user.html',
  styleUrls: ['./register-user.css']
})
export class UserRegister {

  user = {
    restaurantId: '',
    email: '',
    password: ''
  };

  showPassword = false;
  successMessage = '';
  errorMessages: string[] = [];
  submitted = false;

  constructor(private http: HttpClient, private router: Router) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  register() {
    this.submitted = true;
    this.errorMessages = [];
    this.successMessage = '';

    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      this.errorMessages = ['Restaurante não encontrado.'];
      this.submitted = false;
      return;
    }

    const payload = {
      restaurantId,
      email: this.user.email,
      password: this.user.password
    };

    this.http.post(`${environment.apiUrl}/api/Users`, payload)
      .subscribe({
        next: () => {
          localStorage.setItem('pendingEmail', this.user.email);
          this.user.email = '';
          this.user.password = '';
          this.router.navigate(['/confirm-email']);
        },
        error: (err: any) => {
          this.submitted = false;
          console.error(err);

          if (err?.error?.errors && typeof err.error.errors === 'object') {
            this.errorMessages = Object.values(err.error.errors)
              .flatMap(arr => (Array.isArray(arr) ? arr.map(e => String(e)) : []));
          } else if (err?.error?.message) {
            this.errorMessages = [err.error.message];
          } else {
            this.errorMessages = ['Erro ao cadastrar usuário'];
          }
        }
      });
  }
}