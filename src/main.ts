import { createApp } from './app';
async function main() {
  const app = await createApp();
  await app.listen(Number(process.env.PORT || 3001),process.env.HOST || '127.0.0.1');
  console.log(`Issue Desk: ${await app.getUrl()}/docs`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Startup failed'); process.exitCode=1; });
