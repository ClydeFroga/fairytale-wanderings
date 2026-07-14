import { Context, Telegraf } from "telegraf";
import { startTexts } from "../../texts/startTexts";
import type { Listener } from "./Listener";
import { UserMethods } from "@global/database/methods/user";

export class StartListener implements Listener {
  constructor(private readonly bot: Telegraf) {
    this.bot = bot;
  }

  init() {
    this.bot.command("start", this.start.bind(this));
  }

  private async start(ctx: Context) {
    if (!ctx.from) return;

    // Сохраняем пользователя при первом входе — telegramId нужен для заказов
    // и уведомлений (Этап 5). Телефон больше не обязателен: личность приходит
    // из initData Mini App.
    const existing = await UserMethods.getByTelegramId(ctx.from.id);
    if (!existing) {
      await UserMethods.create({
        telegramId: ctx.from.id,
        firstName: ctx.from.first_name,
        username: ctx.from.username,
      });
    }

    await this.sendWelcome(ctx);
  }

  private async sendWelcome(ctx: Context) {
    const url = process.env.WEBAPP_URL;

    if (!url) {
      console.warn("WEBAPP_URL не задан — кнопка магазина не показана");
      await ctx.reply(startTexts.helloNoWebApp);
      return;
    }

    await ctx.reply(startTexts.hello, {
      reply_markup: {
        inline_keyboard: [[{ text: startTexts.openShopButton, web_app: { url } }]],
      },
    });
  }
}
