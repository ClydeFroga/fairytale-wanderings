import { beforeAll, afterAll, afterEach } from "bun:test";
import { mock } from "bun:test";

// Мокируем модули перед их импортом
// Это предотвратит попытки подключения к MongoDB

// Мокируем mongoose
const SchemaMock: any = class Schema {
  constructor() {}
};
SchemaMock.Types = { ObjectId: class ObjectId {} };

mock.module("mongoose", () => {
  return {
    connect: () => Promise.resolve({}),
    Schema: SchemaMock,
    Types: { ObjectId: class ObjectId {} },
    model: () => {
      return {
        find: () => Promise.resolve([]),
        findById: () => Promise.resolve(null),
        create: (data: any) => Promise.resolve(data),
        findByIdAndUpdate: (id: string, data: any) =>
          Promise.resolve({ _id: id, ...data }),
        findByIdAndDelete: () => Promise.resolve({}),
      };
    },
  };
});

beforeAll(async () => {
  // Выполняется перед всеми тестами
});

afterAll(async () => {
  // Выполняется после всех тестов
});

afterEach(async () => {
  // Выполняется после каждого теста
});
