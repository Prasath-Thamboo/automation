import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AdminClientDetail, AdminClientList } from "@tando/types";
import { AdminGuard } from "../auth/admin.guard";
import { AdminClientsService } from "./admin-clients.service";

@ApiTags("admin-clients")
@Controller("admin/clients")
@UseGuards(AdminGuard)
export class AdminClientsController {
  constructor(private readonly clients: AdminClientsService) {}

  @Get()
  @ApiOkResponse({ description: "Toutes les organisations clientes, de la plus récente à la plus ancienne." })
  list(): Promise<AdminClientList> {
    return this.clients.list();
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string): Promise<AdminClientDetail> {
    return this.clients.get(id);
  }
}
