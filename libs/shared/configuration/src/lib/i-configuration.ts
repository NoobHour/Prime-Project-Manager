export abstract class ILoggingConfiguration {
  sendToConsole: boolean;
}
export abstract class IRESTConfiguration {
  url: string;
}

export abstract class IConfiguration {
  applicationName: string;
  version: string;
  production: boolean;
  debug: boolean;
  rest: IRESTConfiguration;
  logging: ILoggingConfiguration;
}
