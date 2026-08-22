import { Module } from "@nestjs/common";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";
import { JwtGuard } from "../auth/jwt.guard";

@Module({
  controllers: [SyncController],
  providers: [SyncService, JwtGuard],
})
export class SyncModule {}
