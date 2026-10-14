import { createApp } from "./app.js";

try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3001);
if (
  !["127.0.0.1", "localhost", "::1"].includes(host) &&
  !process.env.PUBLIC_ORIGIN
) {
  throw new Error(
    "Network binding requires PUBLIC_ORIGIN, for example http://localhost:3001 behind an authenticated proxy.",
  );
}
createApp().listen(port, host, () => {
  console.log(`day-lilies is available at http://${host}:${port}`);
});
