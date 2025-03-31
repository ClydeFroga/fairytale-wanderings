import { Telegraf } from "telegraf";
import { StartListener } from "./listeners/StartListener";
import { PhoneListener } from "./listeners/PhoneListener";
import type { Listener } from "./listeners/Listener";

class Bot {
  private bot: Telegraf;

  constructor(botToken: string) {
    this.bot = new Telegraf(botToken);
  }

  async start() {
    try {
      console.log("Запуск бота Telegram...");

      this.bot.launch();

      this.startListeners();
    } catch (error) {
      console.error("Критическая ошибка при старте бота:", error);
      throw error;
    }
  }

  stop(reason: string) {
    this.bot.stop(reason);
  }

  private createListeners(): Listener[] {
    return [new StartListener(this.bot), new PhoneListener(this.bot)];
  }

  private startListeners() {
    this.createListeners().forEach((listener) => {
      listener.init();
    });
  }
}

export { Bot };
