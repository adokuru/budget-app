import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ponytail: no ValidationPipe. Request validation is zod, in @budget/shared,
  // so the mobile client and the API validate sync payloads with one schema
  // rather than class-validator here and zod there.
  app.enableShutdownHooks();

  // Render provides PORT and requires binding 0.0.0.0, not localhost.
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`api listening on :${port}`);
}

void bootstrap();
