import type { Context } from "hono";
import type { FilterQuery } from "mongoose";

declare module "hono" {
  interface ContextVariableMap {
    filters: FilterQuery<any>;
  }
}
