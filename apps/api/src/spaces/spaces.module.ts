import { Module } from "@nestjs/common";
import { SpacesService } from "./spaces.service";
import { SpacesController } from "./spaces.controller";
import { JwtGuard } from "../auth/jwt.guard";

@Module({
  controllers: [SpacesController],
  providers: [SpacesService, JwtGuard],
})
export class SpacesModule {}
