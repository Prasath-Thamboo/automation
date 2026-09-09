import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** Numérotation séquentielle DEV-AAAA-NNNN (§4.2), robuste à la concurrence. */
@Injectable()
export class QuoteNumberService {
  constructor(private readonly prisma: PrismaService) {}

  async next(prefix = "DEV"): Promise<string> {
    const year = new Date().getUTCFullYear();
    const key = `${prefix.toLowerCase()}-${year}`;
    const counter = await this.prisma.counter.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
    });
    return `${prefix}-${year}-${String(counter.value).padStart(4, "0")}`;
  }
}
