import { Context, Telegraf } from "telegraf";
import type { InlineKeyboardButton } from "telegraf/types";
import { startTexts } from "../../texts/startTexts";
import type { Listener } from "./Listener";
import { UserMethods } from "@global/database/methods/user";
import { isAdmin } from "@global/telegram/admins";
import { adminWebAppUrl, webAppUrl } from "@global/telegram/webAppUrl";

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

    const admin = isAdmin(ctx.from.id, existing);

    await this.sendWelcome(ctx, admin);
    if (admin) await this.registerAdminCommand(ctx);
  }

  private async sendWelcome(ctx: Context, admin: boolean) {
    const shopUrl = webAppUrl();

    if (!shopUrl) {
      console.warn("WEBAPP_URL не задан — кнопка магазина не показана");
      await ctx.reply(startTexts.helloNoWebApp);
      return;
    }

    const keyboard: InlineKeyboardButton[][] = [
      [{ text: startTexts.openShopButton, web_app: { url: shopUrl } }],
    ];

    // Админу — вторая кнопка: то же Mini App, но открытое сразу на /admin.
    const adminUrl = admin ? adminWebAppUrl() : undefined;
    if (adminUrl) {
      keyboard.push([{ text: startTexts.openAdminButton, web_app: { url: adminUrl } }]);
    }

    await ctx.reply(startTexts.hello, { reply_markup: { inline_keyboard: keyboard } });
  }

  // Кнопка в приветствии уезжает вверх по истории, поэтому админу показываем
  // /admin ещё и в меню команд — но только в его чате (scope: chat).
  private async registerAdminCommand(ctx: Context) {
    if (!ctx.chat) return;

    try {
      await ctx.telegram.setMyCommands(
        [
          { command: "start", description: startTexts.openShopButton },
          { command: "admin", description: startTexts.openAdminButton },
        ],
        { scope: { type: "chat", chat_id: ctx.chat.id } },
      );
    } catch (error) {
      // Не критично: остаётся кнопка в приветствии и сама команда /admin.
      console.warn("Не удалось зарегистрировать команду /admin:", error);
    }
  }
}
