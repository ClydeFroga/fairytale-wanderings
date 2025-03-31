import { Context, Telegraf } from "telegraf";
import { startTexts } from "../../texts/startTexts";
import type { Listener } from "./Listener";
import { UserService } from "../../global/services/user/User.service";

export class StartListener implements Listener {
  constructor(private readonly bot: Telegraf) {
    this.bot = bot;
  }

  init() {
    this.bot.command("start", this.start.bind(this));
  }

  private async start(ctx: Context) {
    if (!ctx.from) return;

    const user = await UserService.getUserByTelegramId(ctx.from.id);

    if (!user) {
      await this.handleNewUser(ctx);
      return;
    }

    if (!user.phone) {
      await this.phoneRequest(ctx);
      return;
    }

    ctx.reply(startTexts.alreadyRegistered);
  }

  private async handleNewUser(ctx: Context) {
    if (!ctx.from) return;

    ctx.reply(startTexts.hello);

    await UserService.createUser({
      telegramId: ctx.from.id,
      firstName: ctx.from.first_name,
      username: ctx.from.username,
    });

    await this.phoneRequest(ctx);
  }

  private async phoneRequest(ctx: Context) {
    //Запрашиваем номер телефона
    await ctx.reply(startTexts.phoneRequest, {
      reply_markup: {
        keyboard: [
          [
            {
              text: startTexts.phoneRequestButton,
              request_contact: true,
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }
}
