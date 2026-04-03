import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

function parseJwt(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export const restaurantGuard: CanActivateFn = () => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return router.parseUrl('/login');
  }

  const token = localStorage.getItem('token');

  if (!token) {
    return router.parseUrl('/login');
  }

  const decoded = parseJwt(token);

  const role =
    decoded?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
    decoded?.role;

  if (role !== 'Restaurant') {
    return router.parseUrl('/login');
  }

  return true;
};