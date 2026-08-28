import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createApp } from "../../app";

// Единственные тесты, где внешний сервис подменяется: CDEK API живёт за сетью и
// требует боевых кредов. Подменяем глобальный fetch — приложение и его роуты
// работают по-настоящему. Токен и список ПВЗ кэшируются в модуле, поэтому у
// каждого теста свой аккаунт и свои параметры запроса.
const app = createApp();

const CDEK_ENV_KEYS = [
  "CDEK_ACCOUNT",
  "CDEK_SECURE_PASSWORD",
  "CDEK_API_URL",
  "CDEK_YANDEX_MAPS_API_KEY",
  "CDEK_FROM_CITY",
  "CDEK_FROM_CITY_CODE",
  "CDEK_DEFAULT_CITY",
  "CDEK_PARCEL_LENGTH",
  "CDEK_PARCEL_WIDTH",
  "CDEK_PARCEL_HEIGHT",
  "CDEK_PARCEL_WEIGHT",
];

const realFetch = globalThis.fetch;

type StubCall = { url: string; init: RequestInit | undefined };

function stubFetch(handler: (url: string, init: RequestInit | undefined) => Response): StubCall[] {
  const calls: StubCall[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;

  return calls;
}

function tokenResponse(): Response {
  return Response.json({ access_token: "test-token", expires_in: 3600 });
}

function setCredentials(account: string) {
  process.env.CDEK_ACCOUNT = account;
  process.env.CDEK_SECURE_PASSWORD = "secret";
  process.env.CDEK_API_URL = "https://api.edu.cdek.ru/v2";
}

describe("CDEK E2E", () => {
  beforeEach(() => {
    for (const key of CDEK_ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    for (const key of CDEK_ENV_KEYS) delete process.env[key];
  });

  it("GET /cdek/config — без настроек виджет выключен", async () => {
    const res = await app.fetch(new Request("http://localhost/cdek/config"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enabled: false });
  });

  it("GET /cdek/config — отдаёт настройки виджета, креды наружу не уходят", async () => {
    setCredentials("config-account");
    process.env.CDEK_YANDEX_MAPS_API_KEY = "ymaps-key";
    process.env.CDEK_FROM_CITY = "Новосибирск";
    process.env.CDEK_FROM_CITY_CODE = "270";
    process.env.CDEK_PARCEL_WEIGHT = "800";

    const res = await app.fetch(new Request("http://localhost/cdek/config"));
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.enabled).toBe(true);
    expect(body.apiKey).toBe("ymaps-key");
    // Отправитель уходит кодом города: по названию калькулятор СДЭК отвечает 400.
    expect(body.from).toEqual({ code: 270, city: "Новосибирск" });
    expect(body.defaultLocation).toBe("Новосибирск"); // по умолчанию — город отправителя
    expect(body.defaultParcel).toEqual({ length: 20, width: 15, height: 10, weight: 800 });
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("GET /cdek/config — без ключа Яндекс.Карт виджет выключен", async () => {
    setCredentials("no-maps-key");
    process.env.CDEK_FROM_CITY = "Новосибирск";
    process.env.CDEK_FROM_CITY_CODE = "270";

    const res = await app.fetch(new Request("http://localhost/cdek/config"));

    expect(await res.json()).toEqual({ enabled: false });
  });

  it("GET /cdek/config — без кода города-отправителя виджет выключен", async () => {
    setCredentials("no-city-code");
    process.env.CDEK_YANDEX_MAPS_API_KEY = "ymaps-key";
    process.env.CDEK_FROM_CITY = "Новосибирск";

    const res = await app.fetch(new Request("http://localhost/cdek/config"));

    expect(await res.json()).toEqual({ enabled: false });
  });

  it("GET /cdek/service — 503, пока интеграция не настроена", async () => {
    const res = await app.fetch(
      new Request("http://localhost/cdek/service?action=offices&city_code=270"),
    );

    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("CDEK_NOT_CONFIGURED");
  });

  it("GET /cdek/service?action=cities — отдаёт справочник городов для настройки", async () => {
    setCredentials("cities-account");

    const calls = stubFetch((url) => {
      if (url.includes("/oauth/token")) return tokenResponse();
      return Response.json([{ code: 278, city: "Красноярск" }]);
    });

    const res = await app.fetch(
      new Request("http://localhost/cdek/service?action=cities&country_codes=RU&city=Красноярск"),
    );

    expect(res.status).toBe(200);
    expect((await res.json())[0].code).toBe(278);

    const citiesCall = calls.find((call) => call.url.includes("/location/cities"))!;
    expect(citiesCall.url).toContain("country_codes=RU");
    expect(citiesCall.url).not.toContain("action=");
  });

  it("GET /cdek/service — 400 на неизвестном действии", async () => {
    const res = await app.fetch(new Request("http://localhost/cdek/service?action=drop"));

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("CDEK_UNKNOWN_ACTION");
  });

  it("GET /cdek/service — отдаёт ПВЗ с X-Total-Elements и кэширует ответ", async () => {
    setCredentials("offices-account");

    const calls = stubFetch((url) => {
      if (url.includes("/oauth/token")) return tokenResponse();

      return new Response(JSON.stringify([{ code: "NSK1" }]), {
        headers: { "Content-Type": "application/json", "X-Total-Elements": "1" },
      });
    });

    const url = "http://localhost/cdek/service?action=offices&city_code=270&page=0&size=1000";
    const res = await app.fetch(new Request(url));

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Total-Elements")).toBe("1");
    expect(await res.json()).toEqual([{ code: "NSK1" }]);

    const officesCall = calls.find((call) => call.url.includes("/deliverypoints"))!;
    expect(officesCall.url).toContain("city_code=270");
    expect(officesCall.url).not.toContain("action="); // служебный параметр в СДЭК не уходит

    // Повторный запрос обслуживается из кэша — в СДЭК не ходим.
    await app.fetch(new Request(url));
    expect(calls.filter((call) => call.url.includes("/deliverypoints")).length).toBe(1);
  });

  it("POST /cdek/service — считает тариф и не шлёт в СДЭК служебный action", async () => {
    setCredentials("calc-account");

    const calls = stubFetch((url) => {
      if (url.includes("/oauth/token")) return tokenResponse();
      return Response.json({ tariff_codes: [{ tariff_code: 136, delivery_sum: 350 }] });
    });

    const res = await app.fetch(
      new Request("http://localhost/cdek/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calculate",
          currency: 1,
          from_location: { address: "Новосибирск" },
          to_location: { code: 270 },
          packages: [{ length: 20, width: 15, height: 10, weight: 500 }],
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).tariff_codes).toHaveLength(1);

    const calcCall = calls.find((call) => call.url.includes("/calculator/tarifflist"))!;
    const sent = JSON.parse(String(calcCall.init?.body));
    expect(sent.action).toBeUndefined();
    expect(sent.packages).toHaveLength(1);
    expect((calcCall.init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-token",
    );
  });

  it("POST /cdek/service — 400 на неизвестном действии", async () => {
    const res = await app.fetch(
      new Request("http://localhost/cdek/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "offices" }),
      }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("CDEK_UNKNOWN_ACTION");
  });

  it("GET /cdek/service — ошибку СДЭК отдаём как 502, без его текста", async () => {
    setCredentials("broken-account");

    stubFetch((url) => {
      if (url.includes("/oauth/token")) return tokenResponse();
      return new Response("Internal details", { status: 400 });
    });

    const res = await app.fetch(
      new Request("http://localhost/cdek/service?action=offices&city_code=999"),
    );
    const body = (await res.json()) as { code: string; error: string };

    expect(res.status).toBe(502);
    expect(body.code).toBe("CDEK_API_ERROR");
    expect(body.error).not.toContain("Internal details");
  });
});
