import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { clientInterceptor } from './client-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideHttpClient(withInterceptors([clientInterceptor])),
    {
      provide: {
        enterAnimationDuration: '200ms',
        exitAnimationDuration: '100ms',
      },
      useValue: { hasBackdrop: false },
    },
  ],
};
