import { Context, Telegraf } from "telegraf";
import type { Listener } from "./Listener";
import { UserService } from "../../global/services/user/User.service";
import { startTexts } from "../../texts/startTexts";
import { formatPhoneNumber } from "../../global/utils/formatPhoneNumber";

export class PhoneListener implements Listener {
  constructor(private readonly bot: Telegraf) {
    this.bot = bot;
  }

  init() {
    this.bot.on("contact", this.phoneReceived.bind(this));
  }

  async phoneReceived(
    ctx: Context & { message: { contact: { phone_number: string } } }
  ) {
    //Получаем номер телефона
    const phone = ctx.message.contact.phone_number;

    if (!ctx.from?.id) {
      ctx.reply(startTexts.phoneRequestError);
      return;
    }

    const formattedPhone = formatPhoneNumber(phone);

    //Сохраняем номер телефона в базе данных
    await UserService.updateUserPhone(ctx.from?.id, formattedPhone);

    ctx.reply(startTexts.phoneRequestSuccess);
  }
}
