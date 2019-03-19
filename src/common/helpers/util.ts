export class Util {
  static get cpusCount(): number {
    const os = require('os');
    return os.cpus().length;
  }
}
