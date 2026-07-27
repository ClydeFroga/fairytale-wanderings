import { Context, Telegraf } from "telegraf";
import type { Listener } from "./Listener";
import { UserMethods } from "@global/database/methods/user";
import { isAdmin } from "@global/telegram/admins";
import { adminWebAppUrl } from "@global/telegram/webAppUrl";
import { startTexts } from "../../texts/startTexts";

/**
 * /admin — постоянный вход в CRM: кнопка открывает Mini App сразу на `/admin`.
 * Для не-админов команда молчит: раздел не афишируем (на фронте он тоже
 * отдаёт 404, а не «нет доступа»).
 */
export class AdminListener implements Listener {
  constructor(private readonly bot: Telegraf) {
    this.bot = bot;
  }

  init() {
    this.bot.command("admin", this.openAdmin.bind(this));
  }

  private async openAdmin(ctx: Context) {
    if (!ctx.from) return;

    const user = await UserMethods.getByTelegramId(ctx.from.id);
    if (!isAdmin(ctx.from.id, user)) return;

    const url = adminWebAppUrl();
    if (!url) {
      // Это видит только админ, поэтому подсказываем причину прямо в чате.
      await ctx.reply(startTexts.adminNoWebApp);
      return;
    }

    await ctx.reply(startTexts.adminHello, {
      reply_markup: {
        inline_keyboard: [[{ text: startTexts.openAdminButton, web_app: { url } }]],
      },
    });
  }
}
