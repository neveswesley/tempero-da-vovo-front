import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

// Espelha o enum PaymentWay do backend
export enum PaymentWay {
  Cash       = 0,
  Card       = 1,
  Pix        = 3,
}

// Espelha o enum RestaurantCategory do backend
export enum RestaurantCategory {
  Brazilian      = 1,
  Pizza          = 2,
  Burger         = 3,
  SnackBar       = 4,
  Japanese       = 5,
  Chinese        = 6,
  Italian        = 7,
  Mexican        = 8,
  Arabic         = 9,
  Barbecue       = 10,
  Seafood        = 11,
  Pasta          = 12,
  Grill          = 13,
  FastFood       = 14,
  Bakery         = 15,
  Cafe           = 16,
  Breakfast      = 17,
  Healthy        = 18,
  Vegetarian     = 19,
  Vegan          = 20,
  NaturalFood    = 21,
  Acai           = 22,
  IceCream       = 23,
  Dessert        = 24,
  Sweets         = 25,
  Confectionery  = 26,
  Drinks         = 27,
  Juice          = 28,
  Smoothie       = 29,
  Regional       = 30,
  Homemade       = 31,
  Marmita        = 32,
}

// Espelha AddressRequest do backend
interface AddressRequest {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

// Espelha CreateRestaurantRequestJson do backend
interface CreateRestaurantRequest {
  name: string;
  phone: string;
  description?: string;
  paymentWays: PaymentWay[];
  restaurantCategory: RestaurantCategory | '';
  address: AddressRequest;
}

@Component({
  selector: 'app-restaurant-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HttpClientModule],
  templateUrl: './restaurant-register.html',
  styleUrls: ['./restaurant-register.css'],
})
export class RestaurantRegister {

  restaurant: CreateRestaurantRequest = {
    name: '',
    phone: '',
    description: '',
    paymentWays: [],
    restaurantCategory: '',
    address: {
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
    },
  };

  // Opções exibidas no template para formas de pagamento
  paymentWayOptions: { value: PaymentWay; label: string }[] = [
    { value: PaymentWay.Cash, label: 'Dinheiro' },
    { value: PaymentWay.Card, label: 'Cartão' },
    { value: PaymentWay.Pix,  label: 'Pix' },
  ];

  // Opções exibidas no template para categoria
  restaurantCategories: { value: RestaurantCategory; label: string }[] = [
    { value: RestaurantCategory.Brazilian,     label: 'Comida Brasileira' },
    { value: RestaurantCategory.Pizza,         label: 'Pizzaria' },
    { value: RestaurantCategory.Burger,        label: 'Hamburgueria' },
    { value: RestaurantCategory.SnackBar,      label: 'Lanchonete' },
    { value: RestaurantCategory.Japanese,      label: 'Japonês / Sushi' },
    { value: RestaurantCategory.Chinese,       label: 'Chinês' },
    { value: RestaurantCategory.Italian,       label: 'Italiano' },
    { value: RestaurantCategory.Mexican,       label: 'Mexicano' },
    { value: RestaurantCategory.Arabic,        label: 'Árabe' },
    { value: RestaurantCategory.Barbecue,      label: 'Churrascaria' },
    { value: RestaurantCategory.Seafood,       label: 'Frutos do Mar' },
    { value: RestaurantCategory.Pasta,         label: 'Massas' },
    { value: RestaurantCategory.Grill,         label: 'Grelhados' },
    { value: RestaurantCategory.FastFood,      label: 'Fast Food' },
    { value: RestaurantCategory.Bakery,        label: 'Padaria' },
    { value: RestaurantCategory.Cafe,          label: 'Cafeteria' },
    { value: RestaurantCategory.Breakfast,     label: 'Café da Manhã' },
    { value: RestaurantCategory.Healthy,       label: 'Saudável / Fit' },
    { value: RestaurantCategory.Vegetarian,    label: 'Vegetariano' },
    { value: RestaurantCategory.Vegan,         label: 'Vegano' },
    { value: RestaurantCategory.NaturalFood,   label: 'Comida Natural' },
    { value: RestaurantCategory.Acai,          label: 'Açaí' },
    { value: RestaurantCategory.IceCream,      label: 'Sorveteria' },
    { value: RestaurantCategory.Dessert,       label: 'Sobremesas' },
    { value: RestaurantCategory.Sweets,        label: 'Doces' },
    { value: RestaurantCategory.Confectionery, label: 'Confeitaria' },
    { value: RestaurantCategory.Drinks,        label: 'Bebidas' },
    { value: RestaurantCategory.Juice,         label: 'Sucos' },
    { value: RestaurantCategory.Smoothie,      label: 'Smoothies' },
    { value: RestaurantCategory.Regional,      label: 'Comida Regional' },
    { value: RestaurantCategory.Homemade,      label: 'Comida Caseira' },
    { value: RestaurantCategory.Marmita,       label: 'Marmitex' },
  ];

  successMessage = '';
  errorMessage = '';
  submitted = false;
  loadingCep = false;
  cepError = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  isPaymentWaySelected(value: PaymentWay): boolean {
    return this.restaurant.paymentWays.includes(value);
  }

  togglePaymentWay(value: PaymentWay): void {
    const index = this.restaurant.paymentWays.indexOf(value);
    if (index === -1) {
      this.restaurant.paymentWays.push(value);
    } else {
      this.restaurant.paymentWays.splice(index, 1);
    }
  }

  fetchAddressByCep(): void {
    const cep = this.restaurant.address.zipCode.replace(/\D/g, '');
    this.cepError = '';

    if (cep.length !== 8) return;

    this.loadingCep = true;

    this.http.get<any>(`https://viacep.com.br/ws/${cep}/json/`).subscribe({
      next: (data) => {
        this.loadingCep = false;

        if (data.erro) {
          this.cepError = 'CEP não encontrado.';
          return;
        }

        this.restaurant.address.street       = data.logradouro  || '';
        this.restaurant.address.neighborhood = data.bairro      || '';
        this.restaurant.address.city         = data.localidade  || '';
        this.restaurant.address.state        = data.uf          || '';
        this.restaurant.address.complement   = data.complemento || '';
      },
      error: () => {
        this.loadingCep = false;
        this.cepError = 'Erro ao buscar CEP. Tente novamente.';
      },
    });
  }

  registerRestaurant(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    const url = 'https://localhost:44356/api/Restaurants';

    // Garante que restaurantCategory é enviado como number, não string
    const payload = {
      ...this.restaurant,
      restaurantCategory: Number(this.restaurant.restaurantCategory),
    };

    this.http.post<any>(url, payload).subscribe({
      next: (response) => {
        this.successMessage = 'Restaurante cadastrado com sucesso!';
        this.submitted = false;

        localStorage.setItem('restaurantId', response.id);

        this.restaurant = {
          name: '',
          phone: '',
          description: '',
          paymentWays: [],
          restaurantCategory: '',
          address: {
            zipCode: '',
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: '',
          },
        };

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
      },
    });
  }
}