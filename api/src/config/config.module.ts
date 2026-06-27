import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  resendConfig,
  googleConfig,
  geminiConfig,
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
        geminiConfig,
        stripeConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),
  ],
})
export class ConfigModule {}
