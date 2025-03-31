import { Context, Telegraf } from "telegraf";
import { Product } from "../../global/database/shema";

class ChooseProduct {
  constructor(private readonly bot: Telegraf) {
    this.bot = bot;
  }

  init() {}

  async listProducts(ctx: Context) {}
}
