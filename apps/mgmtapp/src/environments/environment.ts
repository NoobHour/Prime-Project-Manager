import { APP_BRAND } from '@mgmt/shared/client-server';
// Same-origin API configuration shared by all existing Angular data services.
export const environment = {
  applicationName: APP_BRAND.name,
  version: '1.1.0',
  production: false,
  debug: false,
  rest: { url: '/api' },
  logging: { sendToConsole: false },
};
