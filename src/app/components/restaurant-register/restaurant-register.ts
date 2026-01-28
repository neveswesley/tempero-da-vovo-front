import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-restaurant-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HttpClientModule],
  templateUrl: './restaurant-register.html',
  styleUrls: ['./restaurant-register.css'],
})
export class RestaurantRegister {

  restaurant = {
    name: '',
    phone: '',
    address: ''
  };

  successMessage = '';
  errorMessage = '';
  submitted = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  registerRestaurant() {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    const url = 'https://localhost:44356/api/Restaurants';

    this.http.post<any>(url, this.restaurant).subscribe({
      next: (response) => {
        // feedback
        this.successMessage = 'Restaurante cadastrado com sucesso!';
        this.submitted = false;

        localStorage.setItem('restaurantId', response.id);

        this.restaurant = { name: '', phone: '', address: '' };

        this.router.navigate(['/register-user']);
      },
      error: (err) => {
        this.submitted = false;

        if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else if (err.error?.errors) {
          this.errorMessage = err.error.errors.join(', ');
        } else {
          this.errorMessage = 'Erro desconhecido ao cadastrar restaurante.';
        }

        console.error('Erro ao cadastrar restaurante:', err);
      }
    });
  }
}
