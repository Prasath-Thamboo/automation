import { Controller, Get, Param } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { CatalogList, ProfessionDetail } from "@tando/types";
import { CatalogService } from "./catalog.service";

@ApiTags("catalog")
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("professions")
  @ApiOkResponse({ description: "Métiers publiés + filtres disponibles." })
  list(): Promise<CatalogList> {
    return this.catalog.list();
  }

  @Get("professions/:slug")
  @ApiOkResponse({ description: "Fiche métier complète (§5.1)." })
  detail(@Param("slug") slug: string): Promise<ProfessionDetail> {
    return this.catalog.detail(slug);
  }
}
