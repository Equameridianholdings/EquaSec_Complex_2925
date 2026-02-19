import { HttpInterceptorFn } from '@angular/common/http';

export const clientInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem("bearer-token");
  if (token) {
    req = req.clone({
      setHeaders: {
        "Authorization": `${token}`,
      }
    })
  }
  
  return next(req);
};
