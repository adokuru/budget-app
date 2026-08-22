import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DbModule } from "./db/db.module";
import { HealthController } from "./health/health.controller";
import { AuthModule } from "./auth/auth.module";
import { SyncModule } from "./sync/sync.module";
import { SpacesModule } from "./spaces/spaces.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    SyncModule,
    SpacesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
