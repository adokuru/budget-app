import {
  Body, Controller, Delete, Get, Param, Post, UseGuards, HttpCode,
} from "@nestjs/common";
import { SpacesService } from "./spaces.service";
import { Auth, JwtGuard } from "../auth/jwt.guard";
import { ZodBody } from "../auth/zod.pipe";
import { createSpaceSchema, joinSchema } from "../auth/dto";
import type { AccessClaims } from "../auth/tokens";

@Controller("spaces")
@UseGuards(JwtGuard)
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  list(@Auth() claims: AccessClaims) {
    return this.spaces.listForUser(claims.sub);
  }

  @Post()
  create(
    @Auth() claims: AccessClaims,
    @Body(new ZodBody(createSpaceSchema)) body: { name: string; baseCurrency: string }
  ) {
    return this.spaces.create(claims.sub, body.name, body.baseCurrency);
  }

  @Get(":id/members")
  members(@Auth() claims: AccessClaims, @Param("id") id: string) {
    return this.spaces.members(claims.sub, id);
  }

  @Post(":id/invites")
  invite(@Auth() claims: AccessClaims, @Param("id") id: string) {
    return this.spaces.createInvite(claims.sub, id);
  }

  @Post("join")
  @HttpCode(200)
  join(@Auth() claims: AccessClaims, @Body(new ZodBody(joinSchema)) body: { code: string }) {
    return this.spaces.join(claims.sub, body.code);
  }

  @Delete(":id/members/:userId")
  @HttpCode(204)
  async remove(
    @Auth() claims: AccessClaims,
    @Param("id") id: string,
    @Param("userId") userId: string
  ) {
    await this.spaces.removeMember(claims.sub, id, userId);
  }
}
