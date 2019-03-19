export class ServerHooks {
  static registerProcessHooks() {
    process.on('uncaughtException', ServerHooks.onUncaughtException);
    process.on('unhandledRejection', ServerHooks.onUnhandledRejection);
    process.on('exit', () => console.log(`Process with PID:${process.pid} exited after ${process.uptime()} sec`));
  }

  static onUnhandledRejection(reason: any, p: any) {
    console.error(`${process.pid} - Unhandled rejection ocurred\n` +
      `Promise: ${p}\n` +
      `Reason:${reason.message}\n${reason.stack}`);
  }

  static onUncaughtException(err: Error) {
    console.error(`${process.pid} - Unhandled exception ocurred\n` +
      `${err.message}\n` +
      err.stack);
  }
}
