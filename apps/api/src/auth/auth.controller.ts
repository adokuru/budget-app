import { Body, Controller, Delete, Post, UseGuards, HttpCode } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Auth, JwtGuard } from "./jwt.guard";
import { ZodBody } from "./zod.pipe";
import {
  registerSchema, loginSchema, oauthSchema, refreshSchema,
  type RegisterInput, type LoginInput, type OAuthInput, type RefreshInput,
} from "./dto";
import type { AccessClaims } from "./tokens";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body(new ZodBody(registerSchema)) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body(new ZodBody(loginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }

  @Post("apple")
  @HttpCode(200)
  apple(@Body(new ZodBody(oauthSchema)) body: OAuthInput) {
    return this.auth.oauth("apple", body);
  }

  @Post("google")
  @HttpCode(200)
  google(@Body(new ZodBody(oauthSchema)) body: OAuthInput) {
    return this.auth.oauth("google", body);
  }

  @Post("refresh")
  @HttpCode(200)
  refresh(@Body(new ZodBody(refreshSchema)) body: RefreshInput) {
    return this.auth.refresh(body);
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(JwtGuard)
  async logout(@Auth() claims: AccessClaims) {
    await this.auth.logout(claims.did);
  }

  /** Required by App Store review for any app that offers sign-in. */
  @Delete("account")
  @HttpCode(204)
  @UseGuards(JwtGuard)
  async deleteAccount(@Auth() claims: AccessClaims) {
    await this.auth.deleteAccount(claims.sub);
  }
}
