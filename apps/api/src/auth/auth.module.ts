import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtGuard } from "./jwt.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtGuard],
  exports: [AuthService],
})
export class AuthModule {}
