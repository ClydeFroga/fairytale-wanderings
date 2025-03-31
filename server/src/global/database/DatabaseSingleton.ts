import mongoose from "mongoose";
import "./shema";

class DatabaseSingleton {
  private static instance: DatabaseSingleton;

  private constructor() {}

  public static getInstance(): DatabaseSingleton {
    if (!DatabaseSingleton.instance) {
      DatabaseSingleton.instance = new DatabaseSingleton();
    }
    return DatabaseSingleton.instance;
  }

  public async connect() {
    try {
      console.log("Подключение к MongoDB...");
      console.log("URI:", process.env.MONGO_URI);
      console.log("Пользователь:", process.env.MONGO_USERNAME);

      await mongoose.connect(process.env.MONGO_URI || "", {
        user: process.env.MONGO_USERNAME,
        pass: process.env.MONGO_PASSWORD,
        dbName: "fairytail",
      });

      console.log("Успешное подключение к MongoDB!");
      console.log("Зарегистрированные модели:", Object.keys(mongoose.models));
    } catch (error) {
      console.error("Ошибка подключения к MongoDB:", error);
      throw error;
    }
  }

  public async disconnect() {
    await mongoose.disconnect();
  }
}

export { DatabaseSingleton };
