import { Context, Telegraf } from "telegraf";

// Заготовка под выбор товара в боте (реализация — Этап 3).
class ChooseProduct {
  constructor(private readonly bot: Telegraf) {
    this.bot = bot;
  }

  init() {}

  async listProducts(ctx: Context) {}
}

export { ChooseProduct };
