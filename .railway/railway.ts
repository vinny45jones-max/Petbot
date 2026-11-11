import { defineRailway, fn, github, postgres, preserve, project, ref, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "asia-southeast1-eqsg3a" });
  Postgres.networking = { privateNetworkEndpoint: "postgres", tcpProxies: { "5432": {} } };
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "asia-southeast1-eqsg3a", sizeMB: 5000 });
  const irapet_botVolume = volume("irapet_bot-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "asia-southeast1-eqsg3a", sizeMB: 5000 });
  // restartPolicy ON_FAILURE и 10 повторов — значения Railway по умолчанию: не писать, иначе plan вечно видит разницу
  const Petbot = service("Petbot", {
    source: github("vinny45jones-max/Petbot", { checkSuites: false, rootDirectory: "/web" }),
    // перенесено из web/railway.json (Config as Code перестаёт читаться 01.12.2026)
    start: "npm run start",
    preDeploy: "npm run migrate",
    healthcheck: "/api/health/ready",
    healthcheckTimeout: 60,
    deploy: { restartPolicyMaxRetries: 3 },
    replicas: { "asia-southeast1-eqsg3a": 1 },
    networking: { privateNetworkEndpoint: "petbot" },
    env: { CRON_SECRET: preserve(), DATABASE_URL: preserve(), INDEXNOW_KEY: preserve(), NEXT_PUBLIC_APP_URL: preserve(), PAYLOAD_SECRET: preserve(), TELEGRAM_BOT_TOKEN: preserve(), TELEGRAM_BOT_USERNAME: preserve() },
  });
  const irapet_bot = service("irapet_bot", {
    source: github("vinny45jones-max/Petbot", { checkSuites: false }),
    // перенесено из корневого railway.json: фактически бот запускался так (run_bot.py в репо нет)
    start: "python bot.py",
    deploy: { restartPolicyType: "ALWAYS" },
    replicas: { "asia-southeast1-eqsg3a": 1 },
    networking: { privateNetworkEndpoint: "worker" },
    volumeMounts: { "/data": irapet_botVolume },
    env: { BOT_DATA_DIR: preserve(), CARD_NUMBER: preserve(), CONTACT_PHONE: preserve(), OPENAI_API_KEY: preserve(), TELEGRAM_BOT_TOKEN: preserve(), TELEGRAM_SPECIAL_CHANNEL_ID: preserve() },
  });

  // И-22: расписание в UTC. Функции без сборки — только POST на cron-роуты сайта с CRON_SECRET сайта.
  const cron = (name: string, schedule: string, path: string) =>
    fn(name, {
      codeFile: "./functions/cron-trigger.ts",
      deploy: { cronSchedule: schedule, restartPolicyType: "NEVER" },
      replicas: { "asia-southeast1-eqsg3a": 1 },
      env: { APP_URL: ref(Petbot, "NEXT_PUBLIC_APP_URL"), CRON_SECRET: ref(Petbot, "CRON_SECRET"), CRON_PATH: path },
    });
  const cronReconcile = cron("cron-reconcile", "0 * * * *", "/api/cron/donations-reconcile");
  const cronUrgency = cron("cron-urgency", "0 3 * * *", "/api/cron/urgency-recalc");

  return project("reasonable-commitment", {
    resources: [Postgres, Petbot, irapet_bot, cronReconcile, cronUrgency, postgresVolume, irapet_botVolume],
  });
});
