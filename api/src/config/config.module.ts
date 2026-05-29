import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  resendConfig,
  googleConfig,
  anthropicConfig,
  stripeConfig,
} from './configuration';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        resendConfig,
        googleConfig,
        anthropicConfig,
        stripeConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),
  ],
})
export class ConfigModule {}
