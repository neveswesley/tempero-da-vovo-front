import { Routes } from '@angular/router';
import { RestaurantRegister } from './restaurant-register/restaurant-register';
import { UserRegister } from './register-user/register-user';
import { LoginComponent } from './login-user/login-user';


export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
    pathMatch: 'full'
  },
  {
    path: 'register-user',
    component: UserRegister
  },
  {path: 'register-restaurant',
    component: RestaurantRegister
  },
];
