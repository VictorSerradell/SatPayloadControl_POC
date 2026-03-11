import { inject } from "@angular/core";
import { ResolveFn } from "@angular/router";
import {
  CommandsService,
  CommandCatalogItem,
} from "../../core/commands/commands.service";

export const commandsCatalogResolver: ResolveFn<CommandCatalogItem[]> = () => {
  return inject(CommandsService).getCatalog();
};
