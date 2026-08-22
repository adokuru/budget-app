import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { verifyAccessToken, type AccessClaims } from "./tokens";

export type AuthedRequest = Request & { auth?: AccessClaims };

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) throw new UnauthorizedException("Missing bearer token");

    const claims = await verifyAccessToken(token, this.config.get<string>("JWT_SECRET") ?? "");
    if (!claims) throw new UnauthorizedException("Invalid or expired token");

    req.auth = claims;
    return true;
  }
}

export const Auth = createParamDecorator((_data, ctx: ExecutionContext): AccessClaims => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!req.auth) throw new UnauthorizedException();
  return req.auth;
});
