import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout();
      } else if (err.status === 429) {
        snackBar.open('Rate limit exceeded. Please wait.', 'Close', { duration: 4000, panelClass: 'snack-warn' });
      } else if (err.status >= 500) {
        snackBar.open('Server error. Check backend logs.', 'Close', { duration: 4000, panelClass: 'snack-error' });
      }
      return throwError(() => err);
    })
  );
};
