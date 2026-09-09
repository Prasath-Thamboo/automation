import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** Numérotation séquentielle inaltérable par préfixe et par année (§9.4). */
@Injectable()
export class SequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(prefix: string): Promise<string> {
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
