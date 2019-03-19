const util = require('util');
declare const moment: any;
const CJSON = require('circular-json');

export class JsonHelper {

  private static UTC_DATE_FORMATS = ['YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', 'YYYY-MM-DDTHH:mm:ss'];

  static parse<T>(jsonBody: string): T {
    return JSON.parse(jsonBody, function reciever(key, value): Date {
      if (typeof value === 'string' && moment(value, JsonHelper.UTC_DATE_FORMATS, true).isValid()) {
        return new Date(value);
      }
      return value;
    });
  }

  static safeJSONParse(str: string): any {
    try {
      return JSON.parse(str);
    } catch (e) {
      return undefined;
    }
  }

  /**
       * Converts a JavaScript value to a JavaScript Object Notation (JSON) string easier to read.
       * with a replacer function that transforms the results
       * with indentation, white space, and line break characters
       * Does not use the JSON.Stringify because of the problem with circular references:
       * "Converting circular structure to JSON - TypeError: Converting circular structure to JSON"
       * WARNING: The generated string can't be parsed back into JSON!!
       */
  static stringify(obj: any, replacer: any = null, space = 2): string {
    return CJSON.stringify(obj, replacer, space);
  }
}
