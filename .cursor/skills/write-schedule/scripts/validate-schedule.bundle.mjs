#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/ajv/dist/runtime/ucs2length.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function ucs2length(str) {
      const len = str.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    exports.default = ucs2length;
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
  }
});

// node_modules/ajv-formats/dist/formats.js
var require_formats = __commonJS({
  "node_modules/ajv-formats/dist/formats.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatNames = exports.fastFormats = exports.fullFormats = void 0;
    function fmtDef(validate, compare) {
      return { validate, compare };
    }
    exports.fullFormats = {
      // date: http://tools.ietf.org/html/rfc3339#section-5.6
      date: fmtDef(date, compareDate),
      // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
      time: fmtDef(getTime(true), compareTime),
      "date-time": fmtDef(getDateTime(true), compareDateTime),
      "iso-time": fmtDef(getTime(), compareIsoTime),
      "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
      // duration: https://tools.ietf.org/html/rfc3339#appendix-A
      duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
      uri,
      "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
      // uri-template: https://tools.ietf.org/html/rfc6570
      "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
      // For the source: https://gist.github.com/dperini/729294
      // For test cases: https://mathiasbynens.be/demo/url-regex
      url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
      email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
      hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
      // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
      ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
      ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
      regex,
      // uuid: http://tools.ietf.org/html/rfc4122
      uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
      // JSON-pointer: https://tools.ietf.org/html/rfc6901
      // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
      "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
      "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
      // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
      "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
      // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
      // byte: https://github.com/miguelmota/is-base64
      byte,
      // signed 32 bit integer
      int32: { type: "number", validate: validateInt32 },
      // signed 64 bit integer
      int64: { type: "number", validate: validateInt64 },
      // C-type float
      float: { type: "number", validate: validateNumber },
      // C-type double
      double: { type: "number", validate: validateNumber },
      // hint to the UI to hide input strings
      password: true,
      // unchecked string payload
      binary: true
    };
    exports.fastFormats = {
      ...exports.fullFormats,
      date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
      time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
      "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
      "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
      "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
      // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
      uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
      "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
      // email (sources from jsen validator):
      // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
      // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
      email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
    };
    exports.formatNames = Object.keys(exports.fullFormats);
    function isLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }
    var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
    var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function date(str) {
      const matches = DATE.exec(str);
      if (!matches)
        return false;
      const year = +matches[1];
      const month = +matches[2];
      const day = +matches[3];
      return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
    }
    function compareDate(d1, d2) {
      if (!(d1 && d2))
        return void 0;
      if (d1 > d2)
        return 1;
      if (d1 < d2)
        return -1;
      return 0;
    }
    var TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
    function getTime(strictTimeZone) {
      return function time(str) {
        const matches = TIME.exec(str);
        if (!matches)
          return false;
        const hr = +matches[1];
        const min = +matches[2];
        const sec = +matches[3];
        const tz = matches[4];
        const tzSign = matches[5] === "-" ? -1 : 1;
        const tzH = +(matches[6] || 0);
        const tzM = +(matches[7] || 0);
        if (tzH > 23 || tzM > 59 || strictTimeZone && !tz)
          return false;
        if (hr <= 23 && min <= 59 && sec < 60)
          return true;
        const utcMin = min - tzM * tzSign;
        const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
        return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
      };
    }
    function compareTime(s1, s2) {
      if (!(s1 && s2))
        return void 0;
      const t1 = (/* @__PURE__ */ new Date("2020-01-01T" + s1)).valueOf();
      const t2 = (/* @__PURE__ */ new Date("2020-01-01T" + s2)).valueOf();
      if (!(t1 && t2))
        return void 0;
      return t1 - t2;
    }
    function compareIsoTime(t1, t2) {
      if (!(t1 && t2))
        return void 0;
      const a1 = TIME.exec(t1);
      const a2 = TIME.exec(t2);
      if (!(a1 && a2))
        return void 0;
      t1 = a1[1] + a1[2] + a1[3];
      t2 = a2[1] + a2[2] + a2[3];
      if (t1 > t2)
        return 1;
      if (t1 < t2)
        return -1;
      return 0;
    }
    var DATE_TIME_SEPARATOR = /t|\s/i;
    function getDateTime(strictTimeZone) {
      const time = getTime(strictTimeZone);
      return function date_time(str) {
        const dateTime = str.split(DATE_TIME_SEPARATOR);
        return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
      };
    }
    function compareDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const d1 = new Date(dt1).valueOf();
      const d2 = new Date(dt2).valueOf();
      if (!(d1 && d2))
        return void 0;
      return d1 - d2;
    }
    function compareIsoDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
      const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
      const res = compareDate(d1, d2);
      if (res === void 0)
        return void 0;
      return res || compareTime(t1, t2);
    }
    var NOT_URI_FRAGMENT = /\/|:/;
    var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
    function uri(str) {
      return NOT_URI_FRAGMENT.test(str) && URI.test(str);
    }
    var BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
    function byte(str) {
      BYTE.lastIndex = 0;
      return BYTE.test(str);
    }
    var MIN_INT32 = -(2 ** 31);
    var MAX_INT32 = 2 ** 31 - 1;
    function validateInt32(value) {
      return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
    }
    function validateInt64(value) {
      return Number.isInteger(value);
    }
    function validateNumber() {
      return true;
    }
    var Z_ANCHOR = /[^\\]\\Z/;
    function regex(str) {
      if (Z_ANCHOR.test(str))
        return false;
      try {
        new RegExp(str);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
});

// node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = __commonJS({
  "node_modules/fast-deep-equal/index.js"(exports, module) {
    "use strict";
    module.exports = function equal(a, b) {
      if (a === b) return true;
      if (a && b && typeof a == "object" && typeof b == "object") {
        if (a.constructor !== b.constructor) return false;
        var length, i, keys;
        if (Array.isArray(a)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0; )
            if (!equal(a[i], b[i])) return false;
          return true;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;
        for (i = length; i-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
        for (i = length; i-- !== 0; ) {
          var key = keys[i];
          if (!equal(a[key], b[key])) return false;
        }
        return true;
      }
      return a !== a && b !== b;
    };
  }
});

// node_modules/ajv/dist/runtime/equal.js
var require_equal = __commonJS({
  "node_modules/ajv/dist/runtime/equal.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var equal = require_fast_deep_equal();
    equal.code = 'require("ajv/dist/runtime/equal").default';
    exports.default = equal;
  }
});

// scripts/validate-schedule-cli.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// src/model/generated/scheduleValidator.js
var import_ucs2length = __toESM(require_ucs2length(), 1);
var import_formats = __toESM(require_formats(), 1);
var import_equal = __toESM(require_equal(), 1);
function __standaloneValue(mod, path) {
  const read = (root) => path.reduce((current, key) => current?.[key], root);
  if (path.length === 1 && path[0] === "default" && typeof mod === "function") return mod;
  const direct = read(mod);
  return direct === void 0 ? read(mod?.default) : direct;
}
var scheduleValidator_default = validate20;
var func1 = __standaloneValue(import_ucs2length.default, ["default"]);
var formats0 = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
function validate21(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate21.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
    if (data2.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data2.name === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "id" || key0 === "name")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data2.id !== void 0) {
      let data0 = data2.id;
      if (typeof data0 === "string") {
        if (!formats0.test(data0)) {
          const err3 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
      } else {
        const err4 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data2.name !== void 0) {
      let data1 = data2.name;
      if (typeof data1 === "string") {
        if (func1(data1) < 1) {
          const err5 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
      } else {
        const err6 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
  } else {
    const err7 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  validate21.errors = vErrors;
  return errors === 0;
}
validate21.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema34 = { "type": "object", "additionalProperties": false, "required": ["id", "name", "date", "confidence", "groupId"], "properties": { "id": { "$ref": "#/$defs/scheduleId" }, "name": { "type": "string", "minLength": 1 }, "date": { "$ref": "#/$defs/isoDate" }, "confidence": { "type": "string", "enum": ["tentative", "committed"], "description": "\u65E5\u4ED8\u3092\u5408\u610F\u3057\u305F\u304B\u3069\u3046\u304B\u3002tentative \u306F\u672A\u78BA\u5B9A\u3001committed \u306F\u78BA\u5B9A\u3002\u30BF\u30B9\u30AF\u306E\u78BA\u5EA6\u3068\u306F\u72EC\u7ACB\u3002" }, "groupId": { "$ref": "#/$defs/scheduleId" } } };
var formats4 = __standaloneValue(import_formats.default, ["fullFormats", "date"]);
function validate23(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate23.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
    if (data2.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data2.name === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data2.date === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "date" }, message: "must have required property 'date'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data2.confidence === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "confidence" }, message: "must have required property 'confidence'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data2.groupId === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "groupId" }, message: "must have required property 'groupId'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "id" || key0 === "name" || key0 === "date" || key0 === "confidence" || key0 === "groupId")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data2.id !== void 0) {
      let data0 = data2.id;
      if (typeof data0 === "string") {
        if (!formats0.test(data0)) {
          const err6 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      } else {
        const err7 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data2.name !== void 0) {
      let data1 = data2.name;
      if (typeof data1 === "string") {
        if (func1(data1) < 1) {
          const err8 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
      } else {
        const err9 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data2.date !== void 0) {
      let data22 = data2.date;
      if (typeof data22 === "string") {
        if (!formats4.validate(data22)) {
          const err10 = { instancePath: instancePath + "/date", schemaPath: "#/$defs/isoDate/format", keyword: "format", params: { format: "date" }, message: 'must match format "date"' };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
      } else {
        const err11 = { instancePath: instancePath + "/date", schemaPath: "#/$defs/isoDate/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data2.confidence !== void 0) {
      let data3 = data2.confidence;
      if (typeof data3 !== "string") {
        const err12 = { instancePath: instancePath + "/confidence", schemaPath: "#/properties/confidence/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
      if (!(data3 === "tentative" || data3 === "committed")) {
        const err13 = { instancePath: instancePath + "/confidence", schemaPath: "#/properties/confidence/enum", keyword: "enum", params: { allowedValues: schema34.properties.confidence.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data2.groupId !== void 0) {
      let data4 = data2.groupId;
      if (typeof data4 === "string") {
        if (!formats0.test(data4)) {
          const err14 = { instancePath: instancePath + "/groupId", schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
          if (vErrors === null) {
            vErrors = [err14];
          } else {
            vErrors.push(err14);
          }
          errors++;
        }
      } else {
        const err15 = { instancePath: instancePath + "/groupId", schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
  } else {
    const err16 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err16];
    } else {
      vErrors.push(err16);
    }
    errors++;
  }
  validate23.errors = vErrors;
  return errors === 0;
}
validate23.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var func0 = __standaloneValue(import_equal.default, ["default"]);
function validate25(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate25.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
    if (data2.taskIds === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "taskIds" }, message: "must have required property 'taskIds'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data2.label === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "taskIds" || key0 === "label")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data2.taskIds !== void 0) {
      let data0 = data2.taskIds;
      if (Array.isArray(data0)) {
        if (data0.length > 2) {
          const err3 = { instancePath: instancePath + "/taskIds", schemaPath: "#/properties/taskIds/maxItems", keyword: "maxItems", params: { limit: 2 }, message: "must NOT have more than 2 items" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        if (data0.length < 2) {
          const err4 = { instancePath: instancePath + "/taskIds", schemaPath: "#/properties/taskIds/minItems", keyword: "minItems", params: { limit: 2 }, message: "must NOT have fewer than 2 items" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        const len0 = data0.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data1 = data0[i0];
          if (typeof data1 === "string") {
            if (!formats0.test(data1)) {
              const err5 = { instancePath: instancePath + "/taskIds/" + i0, schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
          } else {
            const err6 = { instancePath: instancePath + "/taskIds/" + i0, schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        let i1 = data0.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func0(data0[i1], data0[j0])) {
                const err7 = { instancePath: instancePath + "/taskIds", schemaPath: "#/properties/taskIds/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err7];
                } else {
                  vErrors.push(err7);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err8 = { instancePath: instancePath + "/taskIds", schemaPath: "#/properties/taskIds/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data2.label !== void 0) {
      let data22 = data2.label;
      if (typeof data22 === "string") {
        if (func1(data22) < 1) {
          const err9 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
      } else {
        const err10 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
  } else {
    const err11 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err11];
    } else {
      vErrors.push(err11);
    }
    errors++;
  }
  validate25.errors = vErrors;
  return errors === 0;
}
validate25.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema45 = { "type": "object", "additionalProperties": false, "required": ["id", "name", "start", "end", "assigneeId", "status", "progress", "confidence", "predecessors", "milestoneId"], "properties": { "id": { "$ref": "#/$defs/scheduleId" }, "name": { "type": "string", "minLength": 1 }, "start": { "$ref": "#/$defs/isoDate" }, "end": { "$ref": "#/$defs/isoDate", "description": "\u7D42\u4E86\u65E5\uFF08\u3053\u306E\u65E5\u3092\u542B\u3080\uFF09\u3002\u958B\u59CB\u65E5\u4EE5\u964D\u3002" }, "assigneeId": { "oneOf": [{ "type": "null" }, { "type": "string", "minLength": 1 }, { "type": "array", "minItems": 1, "maxItems": 1, "uniqueItems": true, "items": { "type": "string", "minLength": 1 } }, { "type": "array", "minItems": 2, "uniqueItems": true, "items": { "type": "string", "minLength": 1 } }], "description": "\u672A\u5272\u5F53\u306F null\u3002\u4E00\u4EBA\u306F id \u306E\u6587\u5B57\u5217\u3001\u307E\u305F\u306F\u8981\u7D201\u3064\u306E\u914D\u5217\u3002\u4E8C\u4EBA\u4EE5\u4E0A\u306F\u5165\u308C\u305F\u9806\u306E id \u914D\u5217\u3002" }, "status": { "$ref": "#/$defs/taskStatus" }, "colorId": { "type": "string", "minLength": 1, "description": "\u8272\u306E\u4E00\u89A7\u306E id\u3002\u8272\u306A\u3057\u306F\u30AD\u30FC\u3092\u66F8\u304B\u306A\u3044\u3002" }, "progress": { "type": "integer", "minimum": 0, "maximum": 100 }, "confidence": { "type": "string", "enum": ["tentative", "committed"], "description": "\u65E5\u4ED8\u3092\u5408\u610F\u3057\u305F\u304B\u3069\u3046\u304B\u3002\u7740\u624B\u3084\u9032\u6357\u3068\u306F\u72EC\u7ACB\u3002tentative \u306F\u672A\u78BA\u5B9A\u3001committed \u306F\u78BA\u5B9A\u3002" }, "predecessors": { "type": "array", "items": { "$ref": "#/$defs/scheduleId" }, "uniqueItems": true }, "milestoneId": { "oneOf": [{ "$ref": "#/$defs/scheduleId" }, { "type": "null" }] }, "todos": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/taskTodoItem" }, "description": "\u9032\u6357\u3092\u4EF6\u6570\u3067\u6C7A\u3081\u308B\u4EFB\u610F\u306E\u9805\u76EE\u30021\u4EF6\u4EE5\u4E0A\u3042\u308B\u3068\u304D\u3060\u3051\u66F8\u304F\u3002" }, "tags": { "type": "array", "items": { "type": "string", "minLength": 1 }, "description": "\u8AAC\u660E\u7528\u306E\u4EFB\u610F\u30BF\u30B0\u3002\u753B\u9762\u3067\u306F\u7D5E\u308A\u8FBC\u307F\u306B\u4F7F\u3046\u3002" }, "fieldValues": { "$ref": "#/$defs/taskFieldValues", "description": "\u8FFD\u52A0\u9805\u76EE\u306E\u5024\u3002\u5B9A\u7FA9\u306E key \u3060\u3051\u30021\u4EF6\u4EE5\u4E0A\u3042\u308B\u3068\u304D\u3060\u3051\u66F8\u304F\u3002" }, "note": { "type": "string", "minLength": 1, "description": "\u30BF\u30B9\u30AF\u306E\u88DC\u8DB3\u8AAC\u660E\uFF08\u4EFB\u610F\uFF09\u3002\u753B\u9762\u3067\u306F\u30CE\u30FC\u30C8\u3068\u3057\u3066\u8868\u793A\u3059\u308B\u3002" } } };
var func11 = Object.prototype.hasOwnProperty;
function validate29(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate29.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
    if (data2.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data2.name === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data2.start === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "start" }, message: "must have required property 'start'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data2.end === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "end" }, message: "must have required property 'end'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data2.assigneeId === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "assigneeId" }, message: "must have required property 'assigneeId'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data2.status === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data2.progress === void 0) {
      const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "progress" }, message: "must have required property 'progress'" };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (data2.confidence === void 0) {
      const err7 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "confidence" }, message: "must have required property 'confidence'" };
      if (vErrors === null) {
        vErrors = [err7];
      } else {
        vErrors.push(err7);
      }
      errors++;
    }
    if (data2.predecessors === void 0) {
      const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "predecessors" }, message: "must have required property 'predecessors'" };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    if (data2.milestoneId === void 0) {
      const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "milestoneId" }, message: "must have required property 'milestoneId'" };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!func11.call(schema45.properties, key0)) {
        const err10 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data2.id !== void 0) {
      let data0 = data2.id;
      if (typeof data0 === "string") {
        if (!formats0.test(data0)) {
          const err11 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
      } else {
        const err12 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
    if (data2.name !== void 0) {
      let data1 = data2.name;
      if (typeof data1 === "string") {
        if (func1(data1) < 1) {
          const err13 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err13];
          } else {
            vErrors.push(err13);
          }
          errors++;
        }
      } else {
        const err14 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data2.start !== void 0) {
      let data22 = data2.start;
      if (typeof data22 === "string") {
        if (!formats4.validate(data22)) {
          const err15 = { instancePath: instancePath + "/start", schemaPath: "#/$defs/isoDate/format", keyword: "format", params: { format: "date" }, message: 'must match format "date"' };
          if (vErrors === null) {
            vErrors = [err15];
          } else {
            vErrors.push(err15);
          }
          errors++;
        }
      } else {
        const err16 = { instancePath: instancePath + "/start", schemaPath: "#/$defs/isoDate/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data2.end !== void 0) {
      let data3 = data2.end;
      if (typeof data3 === "string") {
        if (!formats4.validate(data3)) {
          const err17 = { instancePath: instancePath + "/end", schemaPath: "#/$defs/isoDate/format", keyword: "format", params: { format: "date" }, message: 'must match format "date"' };
          if (vErrors === null) {
            vErrors = [err17];
          } else {
            vErrors.push(err17);
          }
          errors++;
        }
      } else {
        const err18 = { instancePath: instancePath + "/end", schemaPath: "#/$defs/isoDate/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
    if (data2.assigneeId !== void 0) {
      let data4 = data2.assigneeId;
      const _errs14 = errors;
      let valid4 = false;
      let passing0 = null;
      const _errs15 = errors;
      if (data4 !== null) {
        const err19 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
      var _valid0 = _errs15 === errors;
      if (_valid0) {
        valid4 = true;
        passing0 = 0;
      }
      const _errs17 = errors;
      if (typeof data4 === "string") {
        if (func1(data4) < 1) {
          const err20 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/1/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err20];
          } else {
            vErrors.push(err20);
          }
          errors++;
        }
      } else {
        const err21 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/1/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
      var _valid0 = _errs17 === errors;
      if (_valid0 && valid4) {
        valid4 = false;
        passing0 = [passing0, 1];
      } else {
        if (_valid0) {
          valid4 = true;
          passing0 = 1;
        }
        const _errs19 = errors;
        if (Array.isArray(data4)) {
          if (data4.length > 1) {
            const err22 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/2/maxItems", keyword: "maxItems", params: { limit: 1 }, message: "must NOT have more than 1 items" };
            if (vErrors === null) {
              vErrors = [err22];
            } else {
              vErrors.push(err22);
            }
            errors++;
          }
          if (data4.length < 1) {
            const err23 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/2/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
            if (vErrors === null) {
              vErrors = [err23];
            } else {
              vErrors.push(err23);
            }
            errors++;
          }
          const len0 = data4.length;
          for (let i0 = 0; i0 < len0; i0++) {
            let data5 = data4[i0];
            if (typeof data5 === "string") {
              if (func1(data5) < 1) {
                const err24 = { instancePath: instancePath + "/assigneeId/" + i0, schemaPath: "#/properties/assigneeId/oneOf/2/items/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                if (vErrors === null) {
                  vErrors = [err24];
                } else {
                  vErrors.push(err24);
                }
                errors++;
              }
            } else {
              const err25 = { instancePath: instancePath + "/assigneeId/" + i0, schemaPath: "#/properties/assigneeId/oneOf/2/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
          }
          let i1 = data4.length;
          let j0;
          if (i1 > 1) {
            const indices0 = {};
            for (; i1--; ) {
              let item0 = data4[i1];
              if (typeof item0 !== "string") {
                continue;
              }
              if (typeof indices0[item0] == "number") {
                j0 = indices0[item0];
                const err26 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/2/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err26];
                } else {
                  vErrors.push(err26);
                }
                errors++;
                break;
              }
              indices0[item0] = i1;
            }
          }
        } else {
          const err27 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/2/type", keyword: "type", params: { type: "array" }, message: "must be array" };
          if (vErrors === null) {
            vErrors = [err27];
          } else {
            vErrors.push(err27);
          }
          errors++;
        }
        var _valid0 = _errs19 === errors;
        if (_valid0 && valid4) {
          valid4 = false;
          passing0 = [passing0, 2];
        } else {
          if (_valid0) {
            valid4 = true;
            passing0 = 2;
            var items0 = true;
          }
          const _errs23 = errors;
          if (Array.isArray(data4)) {
            if (data4.length < 2) {
              const err28 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/3/minItems", keyword: "minItems", params: { limit: 2 }, message: "must NOT have fewer than 2 items" };
              if (vErrors === null) {
                vErrors = [err28];
              } else {
                vErrors.push(err28);
              }
              errors++;
            }
            const len1 = data4.length;
            for (let i2 = 0; i2 < len1; i2++) {
              let data6 = data4[i2];
              if (typeof data6 === "string") {
                if (func1(data6) < 1) {
                  const err29 = { instancePath: instancePath + "/assigneeId/" + i2, schemaPath: "#/properties/assigneeId/oneOf/3/items/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err29];
                  } else {
                    vErrors.push(err29);
                  }
                  errors++;
                }
              } else {
                const err30 = { instancePath: instancePath + "/assigneeId/" + i2, schemaPath: "#/properties/assigneeId/oneOf/3/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err30];
                } else {
                  vErrors.push(err30);
                }
                errors++;
              }
            }
            let i3 = data4.length;
            let j1;
            if (i3 > 1) {
              const indices1 = {};
              for (; i3--; ) {
                let item1 = data4[i3];
                if (typeof item1 !== "string") {
                  continue;
                }
                if (typeof indices1[item1] == "number") {
                  j1 = indices1[item1];
                  const err31 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/3/uniqueItems", keyword: "uniqueItems", params: { i: i3, j: j1 }, message: "must NOT have duplicate items (items ## " + j1 + " and " + i3 + " are identical)" };
                  if (vErrors === null) {
                    vErrors = [err31];
                  } else {
                    vErrors.push(err31);
                  }
                  errors++;
                  break;
                }
                indices1[item1] = i3;
              }
            }
          } else {
            const err32 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/3/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err32];
            } else {
              vErrors.push(err32);
            }
            errors++;
          }
          var _valid0 = _errs23 === errors;
          if (_valid0 && valid4) {
            valid4 = false;
            passing0 = [passing0, 3];
          } else {
            if (_valid0) {
              valid4 = true;
              passing0 = 3;
              if (items0 !== true) {
                items0 = true;
              }
            }
          }
        }
      }
      if (!valid4) {
        const err33 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
        if (vErrors === null) {
          vErrors = [err33];
        } else {
          vErrors.push(err33);
        }
        errors++;
      } else {
        errors = _errs14;
        if (vErrors !== null) {
          if (_errs14) {
            vErrors.length = _errs14;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data2.status !== void 0) {
      let data7 = data2.status;
      if (typeof data7 === "string") {
        if (func1(data7) < 1) {
          const err34 = { instancePath: instancePath + "/status", schemaPath: "#/$defs/taskStatus/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err34];
          } else {
            vErrors.push(err34);
          }
          errors++;
        }
      } else {
        const err35 = { instancePath: instancePath + "/status", schemaPath: "#/$defs/taskStatus/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err35];
        } else {
          vErrors.push(err35);
        }
        errors++;
      }
    }
    if (data2.colorId !== void 0) {
      let data8 = data2.colorId;
      if (typeof data8 === "string") {
        if (func1(data8) < 1) {
          const err36 = { instancePath: instancePath + "/colorId", schemaPath: "#/properties/colorId/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err36];
          } else {
            vErrors.push(err36);
          }
          errors++;
        }
      } else {
        const err37 = { instancePath: instancePath + "/colorId", schemaPath: "#/properties/colorId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err37];
        } else {
          vErrors.push(err37);
        }
        errors++;
      }
    }
    if (data2.progress !== void 0) {
      let data9 = data2.progress;
      if (!(typeof data9 == "number" && (!(data9 % 1) && !isNaN(data9)))) {
        const err38 = { instancePath: instancePath + "/progress", schemaPath: "#/properties/progress/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err38];
        } else {
          vErrors.push(err38);
        }
        errors++;
      }
      if (typeof data9 == "number") {
        if (data9 > 100 || isNaN(data9)) {
          const err39 = { instancePath: instancePath + "/progress", schemaPath: "#/properties/progress/maximum", keyword: "maximum", params: { comparison: "<=", limit: 100 }, message: "must be <= 100" };
          if (vErrors === null) {
            vErrors = [err39];
          } else {
            vErrors.push(err39);
          }
          errors++;
        }
        if (data9 < 0 || isNaN(data9)) {
          const err40 = { instancePath: instancePath + "/progress", schemaPath: "#/properties/progress/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
          if (vErrors === null) {
            vErrors = [err40];
          } else {
            vErrors.push(err40);
          }
          errors++;
        }
      }
    }
    if (data2.confidence !== void 0) {
      let data10 = data2.confidence;
      if (typeof data10 !== "string") {
        const err41 = { instancePath: instancePath + "/confidence", schemaPath: "#/properties/confidence/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err41];
        } else {
          vErrors.push(err41);
        }
        errors++;
      }
      if (!(data10 === "tentative" || data10 === "committed")) {
        const err42 = { instancePath: instancePath + "/confidence", schemaPath: "#/properties/confidence/enum", keyword: "enum", params: { allowedValues: schema45.properties.confidence.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err42];
        } else {
          vErrors.push(err42);
        }
        errors++;
      }
    }
    if (data2.predecessors !== void 0) {
      let data11 = data2.predecessors;
      if (Array.isArray(data11)) {
        const len2 = data11.length;
        for (let i4 = 0; i4 < len2; i4++) {
          let data12 = data11[i4];
          if (typeof data12 === "string") {
            if (!formats0.test(data12)) {
              const err43 = { instancePath: instancePath + "/predecessors/" + i4, schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
              if (vErrors === null) {
                vErrors = [err43];
              } else {
                vErrors.push(err43);
              }
              errors++;
            }
          } else {
            const err44 = { instancePath: instancePath + "/predecessors/" + i4, schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err44];
            } else {
              vErrors.push(err44);
            }
            errors++;
          }
        }
        let i5 = data11.length;
        let j2;
        if (i5 > 1) {
          outer0: for (; i5--; ) {
            for (j2 = i5; j2--; ) {
              if (func0(data11[i5], data11[j2])) {
                const err45 = { instancePath: instancePath + "/predecessors", schemaPath: "#/properties/predecessors/uniqueItems", keyword: "uniqueItems", params: { i: i5, j: j2 }, message: "must NOT have duplicate items (items ## " + j2 + " and " + i5 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err45];
                } else {
                  vErrors.push(err45);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err46 = { instancePath: instancePath + "/predecessors", schemaPath: "#/properties/predecessors/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err46];
        } else {
          vErrors.push(err46);
        }
        errors++;
      }
    }
    if (data2.milestoneId !== void 0) {
      let data13 = data2.milestoneId;
      const _errs42 = errors;
      let valid16 = false;
      let passing1 = null;
      const _errs43 = errors;
      if (typeof data13 === "string") {
        if (!formats0.test(data13)) {
          const err47 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
          if (vErrors === null) {
            vErrors = [err47];
          } else {
            vErrors.push(err47);
          }
          errors++;
        }
      } else {
        const err48 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err48];
        } else {
          vErrors.push(err48);
        }
        errors++;
      }
      var _valid1 = _errs43 === errors;
      if (_valid1) {
        valid16 = true;
        passing1 = 0;
      }
      const _errs46 = errors;
      if (data13 !== null) {
        const err49 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/properties/milestoneId/oneOf/1/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err49];
        } else {
          vErrors.push(err49);
        }
        errors++;
      }
      var _valid1 = _errs46 === errors;
      if (_valid1 && valid16) {
        valid16 = false;
        passing1 = [passing1, 1];
      } else {
        if (_valid1) {
          valid16 = true;
          passing1 = 1;
        }
      }
      if (!valid16) {
        const err50 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/properties/milestoneId/oneOf", keyword: "oneOf", params: { passingSchemas: passing1 }, message: "must match exactly one schema in oneOf" };
        if (vErrors === null) {
          vErrors = [err50];
        } else {
          vErrors.push(err50);
        }
        errors++;
      } else {
        errors = _errs42;
        if (vErrors !== null) {
          if (_errs42) {
            vErrors.length = _errs42;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data2.todos !== void 0) {
      let data14 = data2.todos;
      if (Array.isArray(data14)) {
        if (data14.length < 1) {
          const err51 = { instancePath: instancePath + "/todos", schemaPath: "#/properties/todos/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err51];
          } else {
            vErrors.push(err51);
          }
          errors++;
        }
        const len3 = data14.length;
        for (let i6 = 0; i6 < len3; i6++) {
          let data15 = data14[i6];
          if (data15 && typeof data15 == "object" && !Array.isArray(data15)) {
            if (data15.text === void 0) {
              const err52 = { instancePath: instancePath + "/todos/" + i6, schemaPath: "#/$defs/taskTodoItem/required", keyword: "required", params: { missingProperty: "text" }, message: "must have required property 'text'" };
              if (vErrors === null) {
                vErrors = [err52];
              } else {
                vErrors.push(err52);
              }
              errors++;
            }
            if (data15.done === void 0) {
              const err53 = { instancePath: instancePath + "/todos/" + i6, schemaPath: "#/$defs/taskTodoItem/required", keyword: "required", params: { missingProperty: "done" }, message: "must have required property 'done'" };
              if (vErrors === null) {
                vErrors = [err53];
              } else {
                vErrors.push(err53);
              }
              errors++;
            }
            for (const key1 in data15) {
              if (!(key1 === "text" || key1 === "done")) {
                const err54 = { instancePath: instancePath + "/todos/" + i6, schemaPath: "#/$defs/taskTodoItem/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err54];
                } else {
                  vErrors.push(err54);
                }
                errors++;
              }
            }
            if (data15.text !== void 0) {
              let data16 = data15.text;
              if (typeof data16 === "string") {
                if (func1(data16) < 1) {
                  const err55 = { instancePath: instancePath + "/todos/" + i6 + "/text", schemaPath: "#/$defs/taskTodoItem/properties/text/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err55];
                  } else {
                    vErrors.push(err55);
                  }
                  errors++;
                }
              } else {
                const err56 = { instancePath: instancePath + "/todos/" + i6 + "/text", schemaPath: "#/$defs/taskTodoItem/properties/text/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err56];
                } else {
                  vErrors.push(err56);
                }
                errors++;
              }
            }
            if (data15.done !== void 0) {
              if (typeof data15.done !== "boolean") {
                const err57 = { instancePath: instancePath + "/todos/" + i6 + "/done", schemaPath: "#/$defs/taskTodoItem/properties/done/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err57];
                } else {
                  vErrors.push(err57);
                }
                errors++;
              }
            }
          } else {
            const err58 = { instancePath: instancePath + "/todos/" + i6, schemaPath: "#/$defs/taskTodoItem/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err58];
            } else {
              vErrors.push(err58);
            }
            errors++;
          }
        }
      } else {
        const err59 = { instancePath: instancePath + "/todos", schemaPath: "#/properties/todos/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err59];
        } else {
          vErrors.push(err59);
        }
        errors++;
      }
    }
    if (data2.tags !== void 0) {
      let data18 = data2.tags;
      if (Array.isArray(data18)) {
        const len4 = data18.length;
        for (let i7 = 0; i7 < len4; i7++) {
          let data19 = data18[i7];
          if (typeof data19 === "string") {
            if (func1(data19) < 1) {
              const err60 = { instancePath: instancePath + "/tags/" + i7, schemaPath: "#/properties/tags/items/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err60];
              } else {
                vErrors.push(err60);
              }
              errors++;
            }
          } else {
            const err61 = { instancePath: instancePath + "/tags/" + i7, schemaPath: "#/properties/tags/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err61];
            } else {
              vErrors.push(err61);
            }
            errors++;
          }
        }
      } else {
        const err62 = { instancePath: instancePath + "/tags", schemaPath: "#/properties/tags/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err62];
        } else {
          vErrors.push(err62);
        }
        errors++;
      }
    }
    if (data2.fieldValues !== void 0) {
      let data20 = data2.fieldValues;
      if (data20 && typeof data20 == "object" && !Array.isArray(data20)) {
        for (const key2 in data20) {
          let data21 = data20[key2];
          const _errs67 = errors;
          let valid26 = false;
          let passing2 = null;
          const _errs68 = errors;
          if (typeof data21 === "string") {
            if (func1(data21) < 1) {
              const err63 = { instancePath: instancePath + "/fieldValues/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/$defs/taskFieldValues/additionalProperties/oneOf/0/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err63];
              } else {
                vErrors.push(err63);
              }
              errors++;
            }
          } else {
            const err64 = { instancePath: instancePath + "/fieldValues/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/$defs/taskFieldValues/additionalProperties/oneOf/0/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err64];
            } else {
              vErrors.push(err64);
            }
            errors++;
          }
          var _valid2 = _errs68 === errors;
          if (_valid2) {
            valid26 = true;
            passing2 = 0;
          }
          const _errs70 = errors;
          if (!(typeof data21 == "number")) {
            const err65 = { instancePath: instancePath + "/fieldValues/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/$defs/taskFieldValues/additionalProperties/oneOf/1/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err65];
            } else {
              vErrors.push(err65);
            }
            errors++;
          }
          var _valid2 = _errs70 === errors;
          if (_valid2 && valid26) {
            valid26 = false;
            passing2 = [passing2, 1];
          } else {
            if (_valid2) {
              valid26 = true;
              passing2 = 1;
            }
          }
          if (!valid26) {
            const err66 = { instancePath: instancePath + "/fieldValues/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/$defs/taskFieldValues/additionalProperties/oneOf", keyword: "oneOf", params: { passingSchemas: passing2 }, message: "must match exactly one schema in oneOf" };
            if (vErrors === null) {
              vErrors = [err66];
            } else {
              vErrors.push(err66);
            }
            errors++;
          } else {
            errors = _errs67;
            if (vErrors !== null) {
              if (_errs67) {
                vErrors.length = _errs67;
              } else {
                vErrors = null;
              }
            }
          }
        }
      } else {
        const err67 = { instancePath: instancePath + "/fieldValues", schemaPath: "#/$defs/taskFieldValues/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err67];
        } else {
          vErrors.push(err67);
        }
        errors++;
      }
    }
    if (data2.note !== void 0) {
      let data22 = data2.note;
      if (typeof data22 === "string") {
        if (func1(data22) < 1) {
          const err68 = { instancePath: instancePath + "/note", schemaPath: "#/properties/note/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err68];
          } else {
            vErrors.push(err68);
          }
          errors++;
        }
      } else {
        const err69 = { instancePath: instancePath + "/note", schemaPath: "#/properties/note/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err69];
        } else {
          vErrors.push(err69);
        }
        errors++;
      }
    }
  } else {
    const err70 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err70];
    } else {
      vErrors.push(err70);
    }
    errors++;
  }
  validate29.errors = vErrors;
  return errors === 0;
}
validate29.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate28(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate28.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
    if (data2.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data2.name === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data2.tasks === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "tasks" }, message: "must have required property 'tasks'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "id" || key0 === "name" || key0 === "tasks")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data2.id !== void 0) {
      let data0 = data2.id;
      if (typeof data0 === "string") {
        if (!formats0.test(data0)) {
          const err4 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data2.name !== void 0) {
      let data1 = data2.name;
      if (typeof data1 === "string") {
        if (func1(data1) < 1) {
          const err6 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      } else {
        const err7 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data2.tasks !== void 0) {
      let data22 = data2.tasks;
      if (Array.isArray(data22)) {
        const len0 = data22.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate29(data22[i0], { instancePath: instancePath + "/tasks/" + i0, parentData: data22, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate29.errors : vErrors.concat(validate29.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err8 = { instancePath: instancePath + "/tasks", schemaPath: "#/properties/tasks/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
  } else {
    const err9 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err9];
    } else {
      vErrors.push(err9);
    }
    errors++;
  }
  validate28.errors = vErrors;
  return errors === 0;
}
validate28.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate27(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate27.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
    if (data2.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data2.name === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data2.groups === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "groups" }, message: "must have required property 'groups'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "id" || key0 === "name" || key0 === "groups")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data2.id !== void 0) {
      let data0 = data2.id;
      if (typeof data0 === "string") {
        if (!formats0.test(data0)) {
          const err4 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data2.name !== void 0) {
      let data1 = data2.name;
      if (typeof data1 === "string") {
        if (func1(data1) < 1) {
          const err6 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      } else {
        const err7 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data2.groups !== void 0) {
      let data22 = data2.groups;
      if (Array.isArray(data22)) {
        if (data22.length < 1) {
          const err8 = { instancePath: instancePath + "/groups", schemaPath: "#/properties/groups/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        const len0 = data22.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate28(data22[i0], { instancePath: instancePath + "/groups/" + i0, parentData: data22, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err9 = { instancePath: instancePath + "/groups", schemaPath: "#/properties/groups/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
  } else {
    const err10 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err10];
    } else {
      vErrors.push(err10);
    }
    errors++;
  }
  validate27.errors = vErrors;
  return errors === 0;
}
validate27.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var wrapper0 = { validate: validate33 };
function validate34(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate34.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
    if (data2.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data2.name === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data2.children === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "children" }, message: "must have required property 'children'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "id" || key0 === "name" || key0 === "children")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data2.id !== void 0) {
      let data0 = data2.id;
      if (typeof data0 === "string") {
        if (!formats0.test(data0)) {
          const err4 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = { instancePath: instancePath + "/id", schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data2.name !== void 0) {
      let data1 = data2.name;
      if (typeof data1 === "string") {
        if (func1(data1) < 1) {
          const err6 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      } else {
        const err7 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data2.children !== void 0) {
      let data22 = data2.children;
      if (Array.isArray(data22)) {
        const len0 = data22.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!wrapper0.validate(data22[i0], { instancePath: instancePath + "/children/" + i0, parentData: data22, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? wrapper0.validate.errors : vErrors.concat(wrapper0.validate.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err8 = { instancePath: instancePath + "/children", schemaPath: "#/properties/children/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
  } else {
    const err9 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err9];
    } else {
      vErrors.push(err9);
    }
    errors++;
  }
  validate34.errors = vErrors;
  return errors === 0;
}
validate34.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate33(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate33.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  const _errs0 = errors;
  let valid0 = false;
  let passing0 = null;
  const _errs1 = errors;
  if (!validate34(data2, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate34.errors : vErrors.concat(validate34.errors);
    errors = vErrors.length;
  }
  var _valid0 = _errs1 === errors;
  if (_valid0) {
    valid0 = true;
    passing0 = 0;
    var props0 = true;
  }
  const _errs2 = errors;
  if (!validate29(data2, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate29.errors : vErrors.concat(validate29.errors);
    errors = vErrors.length;
  }
  var _valid0 = _errs2 === errors;
  if (_valid0 && valid0) {
    valid0 = false;
    passing0 = [passing0, 1];
  } else {
    if (_valid0) {
      valid0 = true;
      passing0 = 1;
      if (props0 !== true) {
        props0 = true;
      }
    }
  }
  if (!valid0) {
    const err0 = { instancePath, schemaPath: "#/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  } else {
    errors = _errs0;
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0;
      } else {
        vErrors = null;
      }
    }
  }
  validate33.errors = vErrors;
  evaluated0.props = props0;
  return errors === 0;
}
validate33.evaluated = { "dynamicProps": true, "dynamicItems": false };
function validate20(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  ;
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate20.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
    if (data2.schemaVersion === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "schemaVersion" }, message: "must have required property 'schemaVersion'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data2.title === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "title" }, message: "must have required property 'title'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data2.milestoneGroups === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "milestoneGroups" }, message: "must have required property 'milestoneGroups'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data2.milestones === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "milestones" }, message: "must have required property 'milestones'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "schemaVersion" || key0 === "title" || key0 === "milestoneGroups" || key0 === "milestones" || key0 === "connections" || key0 === "levels" || key0 === "categories" || key0 === "outline")) {
        const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data2.schemaVersion !== void 0) {
      let data0 = data2.schemaVersion;
      if (!(typeof data0 == "number" && (!(data0 % 1) && !isNaN(data0)))) {
        const err5 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
      if (8 !== data0) {
        const err6 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/const", keyword: "const", params: { allowedValue: 8 }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data2.title !== void 0) {
      let data1 = data2.title;
      if (typeof data1 === "string") {
        if (func1(data1) < 1) {
          const err7 = { instancePath: instancePath + "/title", schemaPath: "#/properties/title/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
      } else {
        const err8 = { instancePath: instancePath + "/title", schemaPath: "#/properties/title/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data2.milestoneGroups !== void 0) {
      let data22 = data2.milestoneGroups;
      if (Array.isArray(data22)) {
        const len0 = data22.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate21(data22[i0], { instancePath: instancePath + "/milestoneGroups/" + i0, parentData: data22, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err9 = { instancePath: instancePath + "/milestoneGroups", schemaPath: "#/properties/milestoneGroups/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data2.milestones !== void 0) {
      let data4 = data2.milestones;
      if (Array.isArray(data4)) {
        const len1 = data4.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate23(data4[i1], { instancePath: instancePath + "/milestones/" + i1, parentData: data4, parentDataProperty: i1, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err10 = { instancePath: instancePath + "/milestones", schemaPath: "#/properties/milestones/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data2.connections !== void 0) {
      let data6 = data2.connections;
      if (Array.isArray(data6)) {
        if (data6.length < 1) {
          const err11 = { instancePath: instancePath + "/connections", schemaPath: "#/properties/connections/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        const len2 = data6.length;
        for (let i2 = 0; i2 < len2; i2++) {
          if (!validate25(data6[i2], { instancePath: instancePath + "/connections/" + i2, parentData: data6, parentDataProperty: i2, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err12 = { instancePath: instancePath + "/connections", schemaPath: "#/properties/connections/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
    if (data2.levels !== void 0) {
      let data8 = data2.levels;
      if (Array.isArray(data8)) {
        if (data8.length > 5) {
          const err13 = { instancePath: instancePath + "/levels", schemaPath: "#/properties/levels/maxItems", keyword: "maxItems", params: { limit: 5 }, message: "must NOT have more than 5 items" };
          if (vErrors === null) {
            vErrors = [err13];
          } else {
            vErrors.push(err13);
          }
          errors++;
        }
        if (data8.length < 1) {
          const err14 = { instancePath: instancePath + "/levels", schemaPath: "#/properties/levels/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err14];
          } else {
            vErrors.push(err14);
          }
          errors++;
        }
        const len3 = data8.length;
        for (let i3 = 0; i3 < len3; i3++) {
          let data9 = data8[i3];
          if (data9 && typeof data9 == "object" && !Array.isArray(data9)) {
            if (data9.name === void 0) {
              const err15 = { instancePath: instancePath + "/levels/" + i3, schemaPath: "#/$defs/levelDefinition/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
            if (data9.meaning === void 0) {
              const err16 = { instancePath: instancePath + "/levels/" + i3, schemaPath: "#/$defs/levelDefinition/required", keyword: "required", params: { missingProperty: "meaning" }, message: "must have required property 'meaning'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            for (const key1 in data9) {
              if (!(key1 === "name" || key1 === "meaning" || key1 === "instruction")) {
                const err17 = { instancePath: instancePath + "/levels/" + i3, schemaPath: "#/$defs/levelDefinition/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data9.name !== void 0) {
              let data10 = data9.name;
              if (typeof data10 === "string") {
                if (func1(data10) < 1) {
                  const err18 = { instancePath: instancePath + "/levels/" + i3 + "/name", schemaPath: "#/$defs/levelDefinition/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err18];
                  } else {
                    vErrors.push(err18);
                  }
                  errors++;
                }
              } else {
                const err19 = { instancePath: instancePath + "/levels/" + i3 + "/name", schemaPath: "#/$defs/levelDefinition/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data9.meaning !== void 0) {
              let data11 = data9.meaning;
              if (typeof data11 === "string") {
                if (func1(data11) < 1) {
                  const err20 = { instancePath: instancePath + "/levels/" + i3 + "/meaning", schemaPath: "#/$defs/levelDefinition/properties/meaning/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err20];
                  } else {
                    vErrors.push(err20);
                  }
                  errors++;
                }
              } else {
                const err21 = { instancePath: instancePath + "/levels/" + i3 + "/meaning", schemaPath: "#/$defs/levelDefinition/properties/meaning/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
            if (data9.instruction !== void 0) {
              let data12 = data9.instruction;
              if (typeof data12 === "string") {
                if (func1(data12) < 1) {
                  const err22 = { instancePath: instancePath + "/levels/" + i3 + "/instruction", schemaPath: "#/$defs/levelDefinition/properties/instruction/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err22];
                  } else {
                    vErrors.push(err22);
                  }
                  errors++;
                }
              } else {
                const err23 = { instancePath: instancePath + "/levels/" + i3 + "/instruction", schemaPath: "#/$defs/levelDefinition/properties/instruction/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
              }
            }
          } else {
            const err24 = { instancePath: instancePath + "/levels/" + i3, schemaPath: "#/$defs/levelDefinition/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err24];
            } else {
              vErrors.push(err24);
            }
            errors++;
          }
        }
      } else {
        const err25 = { instancePath: instancePath + "/levels", schemaPath: "#/properties/levels/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
    if (data2.categories !== void 0) {
      let data13 = data2.categories;
      if (Array.isArray(data13)) {
        const len4 = data13.length;
        for (let i4 = 0; i4 < len4; i4++) {
          if (!validate27(data13[i4], { instancePath: instancePath + "/categories/" + i4, parentData: data13, parentDataProperty: i4, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err26 = { instancePath: instancePath + "/categories", schemaPath: "#/properties/categories/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err26];
        } else {
          vErrors.push(err26);
        }
        errors++;
      }
    }
    if (data2.outline !== void 0) {
      let data15 = data2.outline;
      if (Array.isArray(data15)) {
        if (data15.length < 1) {
          const err27 = { instancePath: instancePath + "/outline", schemaPath: "#/properties/outline/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err27];
          } else {
            vErrors.push(err27);
          }
          errors++;
        }
        const len5 = data15.length;
        for (let i5 = 0; i5 < len5; i5++) {
          if (!validate33(data15[i5], { instancePath: instancePath + "/outline/" + i5, parentData: data15, parentDataProperty: i5, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate33.errors : vErrors.concat(validate33.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err28 = { instancePath: instancePath + "/outline", schemaPath: "#/properties/outline/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err28];
        } else {
          vErrors.push(err28);
        }
        errors++;
      }
    }
  } else {
    const err29 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err29];
    } else {
      vErrors.push(err29);
    }
    errors++;
  }
  validate20.errors = vErrors;
  return errors === 0;
}
validate20.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };

// src/model/dates.ts
var DAY_MS = 864e5;
var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function isIsoDateString(value) {
  if (!ISO_DATE.test(value)) return false;
  const parsed = parseDate(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return value === isoDate(parsed);
}
function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function isoDate(d) {
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}
function addDays(d, n) {
  if (Number.isInteger(n)) {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n)
    );
  }
  return new Date(d.getTime() + n * DAY_MS);
}

// src/model/uuidV5.ts
var HIERARCHY_ID_NAMESPACE = "8c1e5b2a-85f0-4d3a-9e11-6b0c4a7d2e15";
function uuidV5(namespace, name) {
  const ns = parseUuid(namespace);
  const nameBytes = new TextEncoder().encode(name);
  const data2 = new Uint8Array(ns.length + nameBytes.length);
  data2.set(ns);
  data2.set(nameBytes, ns.length);
  const hash = sha1(data2).subarray(0, 16);
  const bytes = new Uint8Array(hash);
  bytes[6] = bytes[6] & 15 | 80;
  bytes[8] = bytes[8] & 63 | 128;
  return formatUuid(bytes);
}
function parseUuid(value) {
  const hex = value.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error("UUID \u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093");
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
function formatUuid(bytes) {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function sha1(message) {
  const bitLength = message.length * 8;
  const padLength = (64 - (message.length + 9) % 64) % 64;
  const data2 = new Uint8Array(message.length + 1 + padLength + 8);
  data2.set(message);
  data2[message.length] = 128;
  const view = new DataView(data2.buffer);
  view.setUint32(data2.length - 4, bitLength, false);
  let h0 = 1732584193;
  let h1 = 4023233417;
  let h2 = 2562383102;
  let h3 = 271733878;
  let h4 = 3285377520;
  const w = new Uint32Array(80);
  for (let offset = 0; offset < data2.length; offset += 64) {
    for (let t = 0; t < 16; t += 1) {
      w[t] = view.getUint32(offset + t * 4, false);
    }
    for (let t = 16; t < 80; t += 1) {
      const n = (w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16]) >>> 0;
      w[t] = (n << 1 | n >>> 31) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let t = 0; t < 80; t += 1) {
      const f = t < 20 ? b & c | ~b & d : t < 40 ? b ^ c ^ d : t < 60 ? b & c | b & d | c & d : b ^ c ^ d;
      const k = t < 20 ? 1518500249 : t < 40 ? 1859775393 : t < 60 ? 2400959708 : 3395469782;
      const temp = (a << 5 | a >>> 27) + f + e + k + w[t] >>> 0;
      e = d;
      d = c;
      c = (b << 30 | b >>> 2) >>> 0;
      b = a;
      a = temp;
    }
    h0 = h0 + a >>> 0;
    h1 = h1 + b >>> 0;
    h2 = h2 + c >>> 0;
    h3 = h3 + d >>> 0;
    h4 = h4 + e >>> 0;
  }
  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  return out;
}

// src/model/scheduleMigrate.ts
function migrateTaskEndV1ToV2(end) {
  if (!isIsoDateString(end)) return end;
  return isoDate(addDays(parseDate(end), -1));
}
function migrateScheduleToV2(data2) {
  if (data2 == null || typeof data2 !== "object" || Array.isArray(data2)) {
    return data2;
  }
  const doc = data2;
  if (doc.schemaVersion !== 1) return data2;
  const categories = doc.categories;
  if (!Array.isArray(categories)) return data2;
  const nextCategories = categories.map((category) => {
    if (category == null || typeof category !== "object" || Array.isArray(category)) {
      return category;
    }
    const cat = category;
    const groups = cat.groups;
    if (!Array.isArray(groups)) return category;
    const nextGroups = groups.map((group) => {
      if (group == null || typeof group !== "object" || Array.isArray(group)) {
        return group;
      }
      const grp = group;
      const tasks = grp.tasks;
      if (!Array.isArray(tasks)) return group;
      const nextTasks = tasks.map((task) => {
        if (task == null || typeof task !== "object" || Array.isArray(task)) {
          return task;
        }
        const t = task;
        if (typeof t.end !== "string") return task;
        return { ...t, end: migrateTaskEndV1ToV2(t.end) };
      });
      return { ...grp, tasks: nextTasks };
    });
    return { ...cat, groups: nextGroups };
  });
  return {
    ...doc,
    schemaVersion: 2,
    categories: nextCategories
  };
}
function withCommittedConfidence(task) {
  if (task == null || typeof task !== "object" || Array.isArray(task)) {
    return task;
  }
  const t = task;
  if ("confidence" in t) return task;
  return { ...t, confidence: "committed" };
}
function migrateScheduleV3ToV4(data2) {
  if (data2 == null || typeof data2 !== "object" || Array.isArray(data2)) {
    return data2;
  }
  const doc = data2;
  if (doc.schemaVersion !== 3) return data2;
  const categories = doc.categories;
  if (!Array.isArray(categories)) {
    return { ...doc, schemaVersion: 4 };
  }
  const nextCategories = categories.map((category) => {
    if (category == null || typeof category !== "object" || Array.isArray(category)) {
      return category;
    }
    const cat = category;
    const groups = cat.groups;
    if (!Array.isArray(groups)) return category;
    const nextGroups = groups.map((group) => {
      if (group == null || typeof group !== "object" || Array.isArray(group)) {
        return group;
      }
      const grp = group;
      const tasks = grp.tasks;
      if (!Array.isArray(tasks)) return group;
      return { ...grp, tasks: tasks.map(withCommittedConfidence) };
    });
    return { ...cat, groups: nextGroups };
  });
  return {
    ...doc,
    schemaVersion: 4,
    categories: nextCategories
  };
}
function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function collectLeafIds(doc) {
  const used = /* @__PURE__ */ new Set();
  if (Array.isArray(doc.milestoneGroups)) {
    for (const group of doc.milestoneGroups) {
      if (isRecord(group) && typeof group.id === "string") {
        used.add(group.id);
      }
    }
  }
  if (Array.isArray(doc.milestones)) {
    for (const milestone of doc.milestones) {
      if (isRecord(milestone) && typeof milestone.id === "string") {
        used.add(milestone.id);
      }
    }
  }
  if (!Array.isArray(doc.categories)) return used;
  for (const category of doc.categories) {
    if (!isRecord(category) || !Array.isArray(category.groups)) continue;
    for (const group of category.groups) {
      if (!isRecord(group) || !Array.isArray(group.tasks)) continue;
      for (const task of group.tasks) {
        if (isRecord(task) && typeof task.id === "string") used.add(task.id);
      }
    }
  }
  return used;
}
function collectUsedIds(doc) {
  const used = collectLeafIds(doc);
  if (!Array.isArray(doc.categories)) return used;
  for (const category of doc.categories) {
    if (!isRecord(category)) continue;
    if (typeof category.id === "string") used.add(category.id);
    if (!Array.isArray(category.groups)) continue;
    for (const group of category.groups) {
      if (isRecord(group) && typeof group.id === "string") used.add(group.id);
    }
  }
  return used;
}
function takeHierarchyId(used, seed) {
  let id = uuidV5(HIERARCHY_ID_NAMESPACE, seed);
  let n = 2;
  while (used.has(id)) {
    id = uuidV5(HIERARCHY_ID_NAMESPACE, `${seed}\0${n}`);
    n += 1;
    if (n > 1e3) {
      throw new Error("\u30AB\u30C6\u30B4\u30EA ID \u3092\u5272\u308A\u5F53\u3066\u3089\u308C\u307E\u305B\u3093\u3067\u3057\u305F");
    }
  }
  used.add(id);
  return id;
}
function migrateScheduleV4ToV5(data2) {
  if (!isRecord(data2) || data2.schemaVersion !== 4) return data2;
  const used = collectLeafIds(data2);
  const categories = data2.categories;
  if (!Array.isArray(categories)) {
    return { ...data2, schemaVersion: 5 };
  }
  const nextCategories = categories.map((category) => {
    if (!isRecord(category)) return category;
    const categoryName = typeof category.name === "string" ? category.name : "";
    const id = takeHierarchyId(used, `category\0${categoryName}`);
    const groups = category.groups;
    if (!Array.isArray(groups)) return { ...category, id };
    const nextGroups = groups.map((group) => {
      if (!isRecord(group)) return group;
      const groupName = typeof group.name === "string" ? group.name : "";
      const groupId = takeHierarchyId(
        used,
        `group\0${categoryName}\0${groupName}`
      );
      return { ...group, id: groupId };
    });
    return { ...category, id, groups: nextGroups };
  });
  return {
    ...data2,
    schemaVersion: 5,
    categories: nextCategories
  };
}
function fillMissingMilestoneConfidence(data2) {
  if (!isRecord(data2) || data2.schemaVersion !== 5 || !Array.isArray(data2.milestones)) {
    return data2;
  }
  let changed = false;
  const milestones = data2.milestones.map((milestone) => {
    if (!isRecord(milestone) || "confidence" in milestone) return milestone;
    changed = true;
    return { ...milestone, confidence: "committed" };
  });
  return changed ? { ...data2, milestones } : data2;
}
var DEFAULT_MILESTONE_GROUP_NAME = "\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3";
function migrateScheduleV6ToV7(data2) {
  if (!isRecord(data2) || data2.schemaVersion !== 6) return data2;
  return { ...data2, schemaVersion: 7 };
}
function migrateScheduleV7ToV8(data2) {
  if (!isRecord(data2) || data2.schemaVersion !== 7) return data2;
  return { ...data2, schemaVersion: 8 };
}
function migrateScheduleV5ToV6(data2) {
  if (!isRecord(data2) || data2.schemaVersion !== 5) return data2;
  const milestones = data2.milestones;
  if (!Array.isArray(milestones) || milestones.length === 0) {
    return {
      ...data2,
      schemaVersion: 6,
      milestoneGroups: []
    };
  }
  const used = collectUsedIds(data2);
  const groupId = takeHierarchyId(
    used,
    `milestoneGroup\0${DEFAULT_MILESTONE_GROUP_NAME}`
  );
  const milestoneGroups = [{ id: groupId, name: DEFAULT_MILESTONE_GROUP_NAME }];
  const nextMilestones = milestones.map((milestone) => {
    if (!isRecord(milestone)) return milestone;
    if (typeof milestone.groupId === "string") return milestone;
    return { ...milestone, groupId };
  });
  return {
    ...data2,
    schemaVersion: 6,
    milestoneGroups,
    milestones: nextMilestones
  };
}

// src/model/hierarchy.ts
var LEGACY_THREE_LEVEL_DEFS = [
  { name: "\u30AB\u30C6\u30B4\u30EA", meaning: "\u6700\u4E0A\u6BB5\u306E\u898B\u51FA\u3057\u3002" },
  { name: "\u30B0\u30EB\u30FC\u30D7", meaning: "\u30BF\u30B9\u30AF\u306E\u4E00\u3064\u4E0A\u306E\u898B\u51FA\u3057\u3002" },
  { name: "\u30BF\u30B9\u30AF", meaning: "\u6700\u4E0B\u6BB5\u3002" }
];
var LEGACY_THREE_LEVEL_COUNT = LEGACY_THREE_LEVEL_DEFS.length;
function isOutlineBranch(node) {
  return "children" in node && Array.isArray(node.children);
}
function isTaskNode(node) {
  return "start" in node && "end" in node;
}
function documentUsesOutlineStorage(doc) {
  return doc.outline != null && doc.outline.length > 0;
}
function collectTasksFromDocument(doc) {
  const tasks = [];
  if (documentUsesOutlineStorage(doc) && doc.outline != null) {
    walkOutlineTasks(doc.outline, tasks);
    return tasks;
  }
  for (const category of doc.categories) {
    for (const group of category.groups) {
      tasks.push(...group.tasks);
    }
  }
  return tasks;
}
function walkOutlineTasks(nodes, out) {
  for (const node of nodes) {
    if (isTaskNode(node)) {
      out.push(node);
    } else {
      walkOutlineTasks(node.children, out);
    }
  }
}

// src/model/assigneeIds.ts
function assigneeIdsFromJson(value) {
  if (value == null) return [];
  if (typeof value === "string") return [value];
  return [...value];
}
function taskAssigneeIds(task) {
  if (task.assigneeIds != null) {
    return [...task.assigneeIds];
  }
  return assigneeIdsFromJson(task.assigneeId ?? null);
}
function assigneeIdToJson(ids) {
  if (ids.length === 0) return null;
  if (ids.length === 1) return ids[0];
  return [...ids];
}
function normalizeTaskAssigneeFields(task) {
  if (task.assigneeIds != null) {
    return { assigneeIds: [...task.assigneeIds] };
  }
  return { assigneeIds: assigneeIdsFromJson(task.assigneeId ?? null) };
}
function stripLegacyAssignee(task) {
  const { assigneeId: _legacy, assigneeIds: _ids, ...rest } = task;
  void _legacy;
  void _ids;
  return { ...rest, ...normalizeTaskAssigneeFields(task) };
}
function normalizeTaskAssignees(task) {
  return stripLegacyAssignee(task);
}
function normalizeOutlineAssignees(nodes) {
  return nodes.map((node) => {
    if (isTaskNode(node)) {
      return normalizeTaskAssignees(node);
    }
    return {
      ...node,
      children: normalizeOutlineAssignees(node.children)
    };
  });
}
function normalizeAssigneesInDocument(doc) {
  const categories = doc.categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.map((task) => normalizeTaskAssignees(task))
    }))
  }));
  const outline = doc.outline != null ? normalizeOutlineAssignees(doc.outline) : doc.outline;
  return { ...doc, categories, outline };
}
function validateAssigneeIdsSemantics(ids, path) {
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    if (seen.has(id)) {
      return {
        path: `${path}/assigneeId`,
        message: "\u62C5\u5F53\u8005 ID \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
      };
    }
    seen.add(id);
  }
  return null;
}
function isRecord2(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function taskRecordForSchemaValidation(task) {
  const { assigneeIds, assigneeId, ...rest } = task;
  let ids;
  if (Array.isArray(assigneeIds)) {
    ids = assigneeIds;
  } else {
    ids = assigneeIdsFromJson(assigneeId ?? null);
  }
  return { ...rest, assigneeId: assigneeIdToJson(ids) };
}
function outlineNodesForSchemaValidation(nodes) {
  return nodes.map((node) => {
    if (!isRecord2(node)) return node;
    if (Array.isArray(node.children)) {
      return {
        ...node,
        children: outlineNodesForSchemaValidation(node.children)
      };
    }
    if ("start" in node && "end" in node) {
      return taskRecordForSchemaValidation(node);
    }
    return node;
  });
}
function scheduleInputForSchemaValidation(data2) {
  if (!isRecord2(data2)) return data2;
  const next = { ...data2 };
  if (Array.isArray(next.categories)) {
    next.categories = next.categories.map((category) => {
      if (!isRecord2(category)) return category;
      return {
        ...category,
        groups: Array.isArray(category.groups) ? category.groups.map((group) => {
          if (!isRecord2(group)) return group;
          return {
            ...group,
            tasks: Array.isArray(group.tasks) ? group.tasks.map(
              (task) => isRecord2(task) ? taskRecordForSchemaValidation(task) : task
            ) : group.tasks
          };
        }) : category.groups
      };
    });
  }
  if (Array.isArray(next.outline)) {
    next.outline = outlineNodesForSchemaValidation(next.outline);
  }
  return next;
}
function checkTaskAssigneeIdEmptyArray(task, taskPath) {
  const value = task.assigneeId;
  if (Array.isArray(value) && value.length === 0) {
    return {
      path: `${taskPath}/assigneeId`,
      message: "\u62C5\u5F53\u8005\u306E\u914D\u5217\u306F\u7A7A\u306B\u3067\u304D\u307E\u305B\u3093"
    };
  }
  return null;
}
function collectAssigneeIdInputIssuesInTasks(tasks, taskPathPrefix) {
  const issues = [];
  for (let ti = 0; ti < tasks.length; ti += 1) {
    const task = tasks[ti];
    if (!isRecord2(task)) continue;
    const issue = checkTaskAssigneeIdEmptyArray(task, `${taskPathPrefix}/${ti}`);
    if (issue) issues.push(issue);
  }
  return issues;
}
function collectAssigneeIdInputIssuesInOutline(nodes, pathPrefix) {
  const issues = [];
  for (let ni = 0; ni < nodes.length; ni += 1) {
    const node = nodes[ni];
    if (!isRecord2(node)) continue;
    const nodePath = `${pathPrefix}/${ni}`;
    if (Array.isArray(node.children)) {
      issues.push(
        ...collectAssigneeIdInputIssuesInOutline(node.children, `${nodePath}/children`)
      );
    }
    if ("start" in node && "end" in node) {
      const issue = checkTaskAssigneeIdEmptyArray(node, nodePath);
      if (issue) issues.push(issue);
    }
  }
  return issues;
}
function validateAssigneeIdInputSemantics(data2) {
  if (!isRecord2(data2)) return [];
  const issues = [];
  if (Array.isArray(data2.categories)) {
    for (let ci = 0; ci < data2.categories.length; ci += 1) {
      const category = data2.categories[ci];
      if (!isRecord2(category) || !Array.isArray(category.groups)) continue;
      for (let gi = 0; gi < category.groups.length; gi += 1) {
        const group = category.groups[gi];
        if (!isRecord2(group) || !Array.isArray(group.tasks)) continue;
        issues.push(
          ...collectAssigneeIdInputIssuesInTasks(
            group.tasks,
            `/categories/${ci}/groups/${gi}/tasks`
          )
        );
      }
    }
  }
  if (Array.isArray(data2.outline)) {
    issues.push(...collectAssigneeIdInputIssuesInOutline(data2.outline, "/outline"));
  }
  return issues;
}

// src/model/taskFields.ts
function hasNewline(value) {
  return /[\r\n]/.test(value);
}
function normalizeStoredFieldValue(def, value) {
  switch (def.type) {
    case "text": {
      if (typeof value !== "string") return void 0;
      const trimmed = value.trim();
      if (trimmed.length === 0 || hasNewline(value)) return void 0;
      return trimmed;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) return void 0;
      return value;
    }
    case "date": {
      if (typeof value !== "string" || !isIsoDateString(value)) return void 0;
      return value;
    }
    case "choice": {
      if (typeof value !== "string") return void 0;
      if (def.choices == null || !def.choices.includes(value)) return void 0;
      return value;
    }
    default:
      return void 0;
  }
}
function validateTaskFieldValuesSemantics(task, taskPath, fields, extensionFields = []) {
  const issues = [];
  const values = task.fieldValues;
  if (values == null) return issues;
  const allDefs = [...fields ?? [], ...extensionFields];
  const defsByKey = new Map(allDefs.map((field) => [field.key, field]));
  for (const key of Object.keys(values)) {
    const valuePath = `${taskPath}/fieldValues/${key}`;
    const def = defsByKey.get(key);
    if (def == null) {
      const value = values[key];
      if (typeof value !== "string" && typeof value !== "number") {
        issues.push({
          path: valuePath,
          message: "\u5024\u306E\u578B\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093"
        });
      } else if (typeof value === "string" && (value.length === 0 || hasNewline(value))) {
        issues.push({
          path: valuePath,
          message: "\u5024\u306E\u578B\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093"
        });
      } else if (typeof value === "number" && !Number.isFinite(value)) {
        issues.push({
          path: valuePath,
          message: "\u5024\u306E\u578B\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093"
        });
      }
      continue;
    }
    const normalized = normalizeStoredFieldValue(def, values[key]);
    if (normalized === void 0) {
      issues.push({
        path: valuePath,
        message: "\u5024\u306E\u578B\u304C\u5B9A\u7FA9\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093"
      });
    }
  }
  return issues;
}
function normalizeScheduleFieldsForValidation(data2) {
  const next = { ...data2 };
  if (Array.isArray(next.fields)) {
    next.fields = next.fields.map((entry) => {
      if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
        return entry;
      }
      const field = entry;
      const cleaned = { ...field };
      for (const key of ["meaning", "instruction"]) {
        if (key in cleaned && typeof cleaned[key] === "string") {
          const trimmed = cleaned[key].trim();
          if (trimmed.length === 0) {
            delete cleaned[key];
          }
        }
      }
      if ("default" in cleaned) {
        const def = cleaned.default;
        if (def === "" || typeof def === "string" && def.trim().length === 0) {
          delete cleaned.default;
        }
      }
      return cleaned;
    });
  }
  return normalizeTaskFieldValuesInTree(next);
}
function normalizeTaskFieldValuesInTree(data2) {
  let result2 = data2;
  if (Array.isArray(result2.categories)) {
    result2 = {
      ...result2,
      categories: result2.categories.map(
        (category) => normalizeCategoryFieldValues(category)
      )
    };
  }
  if (Array.isArray(result2.outline)) {
    result2 = {
      ...result2,
      outline: result2.outline.map((node) => normalizeOutlineFieldValues(node))
    };
  }
  return result2;
}
function normalizeCategoryFieldValues(category) {
  if (category == null || typeof category !== "object" || Array.isArray(category)) {
    return category;
  }
  const cat = category;
  if (!Array.isArray(cat.groups)) return category;
  return {
    ...cat,
    groups: cat.groups.map((group) => {
      if (group == null || typeof group !== "object" || Array.isArray(group)) {
        return group;
      }
      const grp = group;
      if (!Array.isArray(grp.tasks)) return group;
      return {
        ...grp,
        tasks: grp.tasks.map((task) => normalizeTaskFieldValuesRecord(task))
      };
    })
  };
}
function normalizeOutlineFieldValues(node) {
  if (node == null || typeof node !== "object" || Array.isArray(node)) {
    return node;
  }
  const record = node;
  if ("start" in record && "end" in record) {
    return normalizeTaskFieldValuesRecord(node);
  }
  if (Array.isArray(record.children)) {
    return {
      ...record,
      children: record.children.map((child) => normalizeOutlineFieldValues(child))
    };
  }
  return node;
}
function normalizeTaskFieldValuesRecord(task) {
  if (task == null || typeof task !== "object" || Array.isArray(task)) {
    return task;
  }
  const record = task;
  const fieldValues = record.fieldValues;
  if (fieldValues == null || typeof fieldValues !== "object" || Array.isArray(fieldValues)) {
    return task;
  }
  const keys = Object.keys(fieldValues);
  if (keys.length === 0) {
    const { fieldValues: _removed, ...rest } = record;
    void _removed;
    return rest;
  }
  return task;
}

// src/model/scheduleSemantics.ts
function nonEmptyName(value, label, path) {
  if (value.trim().length === 0) {
    return { path, message: `${label}\u306F\u7A7A\u767D\u306B\u3067\u304D\u307E\u305B\u3093` };
  }
  return null;
}
function validateScheduleSemantics(doc) {
  const issues = [];
  const titleIssue = nonEmptyName(doc.title, "title", "/title");
  if (titleIssue) issues.push(titleIssue);
  const milestoneIds = /* @__PURE__ */ new Set();
  const milestoneGroupIds = /* @__PURE__ */ new Set();
  const milestoneGroupNames = /* @__PURE__ */ new Set();
  for (let gi = 0; gi < doc.milestoneGroups.length; gi += 1) {
    const group = doc.milestoneGroups[gi];
    const base = `/milestoneGroups/${gi}`;
    const nameIssue = nonEmptyName(
      group.name,
      "\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3\u30B0\u30EB\u30FC\u30D7\u540D",
      `${base}/name`
    );
    if (nameIssue) issues.push(nameIssue);
    if (milestoneGroupNames.has(group.name)) {
      issues.push({
        path: `${base}/name`,
        message: "\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3\u30B0\u30EB\u30FC\u30D7\u540D\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
      });
    }
    milestoneGroupNames.add(group.name);
    const groupIdIssue = hierarchyIdConflict(
      "\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3\u30B0\u30EB\u30FC\u30D7",
      group.id,
      milestoneGroupIds,
      new Set(
        doc.milestones.map((item) => item.id)
      ),
      milestoneGroupIds,
      /* @__PURE__ */ new Set(),
      /* @__PURE__ */ new Set(),
      /* @__PURE__ */ new Set()
    );
    if (groupIdIssue) {
      issues.push({ path: `${base}/id`, message: groupIdIssue });
    }
    milestoneGroupIds.add(group.id);
  }
  for (let i = 0; i < doc.milestones.length; i += 1) {
    const milestone = doc.milestones[i];
    const base = `/milestones/${i}`;
    const nameIssue = nonEmptyName(milestone.name, "\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3\u540D", `${base}/name`);
    if (nameIssue) issues.push(nameIssue);
    if (!isIsoDateString(milestone.date)) {
      issues.push({ path: `${base}/date`, message: "\u6709\u52B9\u306A\u65E5\u4ED8\u3067\u306F\u3042\u308A\u307E\u305B\u3093" });
    }
    if (milestoneIds.has(milestone.id)) {
      issues.push({
        path: `${base}/id`,
        message: "\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3 ID \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
      });
    }
    if (milestoneGroupIds.has(milestone.id)) {
      issues.push({
        path: `${base}/id`,
        message: "\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3 ID \u304C\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3\u30B0\u30EB\u30FC\u30D7 ID \u3068\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
      });
    }
    milestoneIds.add(milestone.id);
    if (!milestoneGroupIds.has(milestone.groupId)) {
      issues.push({
        path: `${base}/groupId`,
        message: "\u5B58\u5728\u3057\u306A\u3044\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3\u30B0\u30EB\u30FC\u30D7 ID \u3067\u3059"
      });
    }
  }
  const fieldDefs = void 0;
  if (doc.levels != null) {
    if (doc.levels.length < 1 || doc.levels.length > 5) {
      issues.push({
        path: "/levels",
        message: "\u968E\u5C64\u306E\u6570\u306F1\u304B\u30895\u307E\u3067\u3067\u3059"
      });
    }
    for (let li = 0; li < doc.levels.length; li += 1) {
      const level = doc.levels[li];
      const base = `/levels/${li}`;
      const nameIssue = nonEmptyName(level.name, "\u968E\u5C64\u540D", `${base}/name`);
      if (nameIssue) issues.push(nameIssue);
      const meaningIssue = nonEmptyName(level.meaning, "\u968E\u5C64\u306E\u610F\u5473", `${base}/meaning`);
      if (meaningIssue) issues.push(meaningIssue);
    }
  }
  const hasCategories = doc.categories.length > 0;
  const hasOutline = doc.outline != null && doc.outline.length > 0;
  if (doc.levels == null && !hasCategories) {
    issues.push({
      path: "/categories",
      message: "categories \u304C1\u4EF6\u4EE5\u4E0A\u5FC5\u8981\u3067\u3059"
    });
  }
  if (hasCategories && hasOutline) {
    issues.push({
      path: "/outline",
      message: "categories \u3068 outline \u306F\u540C\u6642\u306B\u66F8\u3051\u307E\u305B\u3093"
    });
  }
  if (doc.levels != null && !hasCategories && !hasOutline) {
    issues.push({
      path: "/categories",
      message: "\u5165\u308C\u5B50\u306E categories \u307E\u305F\u306F outline \u304C\u5FC5\u8981\u3067\u3059"
    });
  }
  const taskIds = /* @__PURE__ */ new Set();
  const categoryIds = /* @__PURE__ */ new Set();
  const groupIds = /* @__PURE__ */ new Set();
  const categoryNames = /* @__PURE__ */ new Set();
  const branchIds = /* @__PURE__ */ new Set();
  if (hasOutline && doc.outline != null) {
    issues.push(
      ...validateOutlineSemantics(
        doc.outline,
        "/outline",
        0,
        doc.levels?.length ?? 0,
        taskIds,
        milestoneIds,
        milestoneGroupIds,
        categoryIds,
        groupIds,
        branchIds,
        fieldDefs
      )
    );
  }
  for (let ci = 0; ci < doc.categories.length; ci += 1) {
    const category = doc.categories[ci];
    const catPath = `/categories/${ci}`;
    const catNameIssue = nonEmptyName(category.name, "\u30AB\u30C6\u30B4\u30EA\u540D", `${catPath}/name`);
    if (catNameIssue) issues.push(catNameIssue);
    if (categoryNames.has(category.name)) {
      issues.push({
        path: `${catPath}/name`,
        message: "\u30AB\u30C6\u30B4\u30EA\u540D\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
      });
    }
    categoryNames.add(category.name);
    const categoryIdIssue = hierarchyIdConflict(
      "\u30AB\u30C6\u30B4\u30EA",
      category.id,
      categoryIds,
      milestoneIds,
      milestoneGroupIds,
      categoryIds,
      groupIds,
      taskIds
    );
    if (categoryIdIssue) {
      issues.push({ path: `${catPath}/id`, message: categoryIdIssue });
    }
    categoryIds.add(category.id);
    const groupNames = /* @__PURE__ */ new Set();
    for (let gi = 0; gi < category.groups.length; gi += 1) {
      const group = category.groups[gi];
      const groupPath = `${catPath}/groups/${gi}`;
      const groupNameIssue = nonEmptyName(group.name, "\u30B0\u30EB\u30FC\u30D7\u540D", `${groupPath}/name`);
      if (groupNameIssue) issues.push(groupNameIssue);
      if (groupNames.has(group.name)) {
        issues.push({
          path: `${groupPath}/name`,
          message: "\u540C\u3058\u30AB\u30C6\u30B4\u30EA\u5185\u3067\u30B0\u30EB\u30FC\u30D7\u540D\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
        });
      }
      groupNames.add(group.name);
      const groupIdIssue = hierarchyIdConflict(
        "\u30B0\u30EB\u30FC\u30D7",
        group.id,
        groupIds,
        milestoneIds,
        milestoneGroupIds,
        categoryIds,
        groupIds,
        taskIds
      );
      if (groupIdIssue) {
        issues.push({ path: `${groupPath}/id`, message: groupIdIssue });
      }
      groupIds.add(group.id);
      for (let ti = 0; ti < group.tasks.length; ti += 1) {
        const task = group.tasks[ti];
        const taskPath = `${groupPath}/tasks/${ti}`;
        issues.push(
          ...validateTaskSemantics(
            task,
            taskPath,
            taskIds,
            milestoneIds,
            milestoneGroupIds,
            categoryIds,
            groupIds,
            fieldDefs
          )
        );
      }
    }
  }
  return issues;
}
function validateOutlineSemantics(nodes, basePath, levelIndex, levelCount, taskIds, milestoneIds, milestoneGroupIds, categoryIds, groupIds, branchIds, fieldDefs) {
  const issues = [];
  const siblingNames = /* @__PURE__ */ new Set();
  const taskParentIndex = levelCount <= 1 ? -1 : Math.max(0, levelCount - 2);
  const expectedTaskLevelIndex = levelCount === 1 ? 0 : taskParentIndex + 1;
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const nodePath = `${basePath}/${i}`;
    if (isTaskNode(node)) {
      if (levelCount > 0 && levelIndex !== expectedTaskLevelIndex) {
        issues.push({
          path: nodePath,
          message: "\u30BF\u30B9\u30AF\u306E\u968E\u5C64\u304C\u5B9A\u7FA9\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093"
        });
      }
      issues.push(
        ...validateTaskSemantics(
          node,
          nodePath,
          taskIds,
          milestoneIds,
          milestoneGroupIds,
          categoryIds,
          groupIds,
          fieldDefs
        )
      );
      continue;
    }
    if (!isOutlineBranch(node)) continue;
    if (levelCount > 0 && levelIndex > taskParentIndex) {
      issues.push({
        path: nodePath,
        message: "\u968E\u5C64\u306E\u6DF1\u3055\u304C\u5B9A\u7FA9\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093"
      });
    }
    const nameIssue = nonEmptyName(node.name, "\u968E\u5C64\u306E\u540D\u524D", `${nodePath}/name`);
    if (nameIssue) issues.push(nameIssue);
    if (siblingNames.has(node.name)) {
      issues.push({
        path: `${nodePath}/name`,
        message: "\u540C\u3058\u968E\u5C64\u5185\u3067\u540D\u524D\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
      });
    }
    siblingNames.add(node.name);
    const branchConflict = hierarchyIdConflict(
      "\u30B0\u30EB\u30FC\u30D7",
      node.id,
      branchIds,
      milestoneIds,
      milestoneGroupIds,
      categoryIds,
      groupIds,
      taskIds
    );
    if (branchConflict) {
      issues.push({ path: `${nodePath}/id`, message: branchConflict });
    }
    branchIds.add(node.id);
    categoryIds.add(node.id);
    if (levelCount > 0) {
      if (levelIndex === taskParentIndex) {
        if (node.children.some((child) => !isTaskNode(child))) {
          issues.push({
            path: `${nodePath}/children`,
            message: "\u30BF\u30B9\u30AF\u306E\u4E00\u3064\u4E0A\u306E\u968E\u5C64\u306E\u4E0B\u306B\u306F\u30BF\u30B9\u30AF\u3060\u3051\u3092\u7F6E\u3051\u307E\u3059"
          });
        }
      } else if (levelIndex < taskParentIndex) {
        if (node.children.length === 0) {
          issues.push({
            path: `${nodePath}/children`,
            message: "\u5B50\u306E\u968E\u5C64\u304C\u5FC5\u8981\u3067\u3059"
          });
        }
        if (node.children.some((child) => isTaskNode(child))) {
          issues.push({
            path: `${nodePath}/children`,
            message: "\u3053\u306E\u968E\u5C64\u306E\u4E0B\u306B\u306F\u898B\u51FA\u3057\u3060\u3051\u3092\u7F6E\u3051\u307E\u3059"
          });
        }
      }
    }
    issues.push(
      ...validateOutlineSemantics(
        node.children,
        `${nodePath}/children`,
        levelIndex + 1,
        levelCount,
        taskIds,
        milestoneIds,
        milestoneGroupIds,
        categoryIds,
        groupIds,
        branchIds,
        fieldDefs
      )
    );
  }
  return issues;
}
function hierarchyIdConflict(kind, id, sameKind, milestoneIds, milestoneGroupIds, categoryIds, groupIds, taskIds) {
  if (milestoneIds.has(id)) return `${kind} ID \u304C\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3 ID \u3068\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`;
  if (milestoneGroupIds.has(id)) {
    return `${kind} ID \u304C\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3\u30B0\u30EB\u30FC\u30D7 ID \u3068\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`;
  }
  if (sameKind.has(id)) return `${kind} ID \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`;
  if (categoryIds.has(id)) return `${kind} ID \u304C\u30AB\u30C6\u30B4\u30EA ID \u3068\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`;
  if (groupIds.has(id)) return `${kind} ID \u304C\u30B0\u30EB\u30FC\u30D7 ID \u3068\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`;
  if (taskIds.has(id)) return `${kind} ID \u304C\u30BF\u30B9\u30AF ID \u3068\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`;
  return null;
}
function validateTaskSemantics(task, taskPath, taskIds, milestoneIds, milestoneGroupIds, categoryIds, groupIds, fieldDefs) {
  const issues = [];
  const nameIssue = nonEmptyName(task.name, "\u30BF\u30B9\u30AF\u540D", `${taskPath}/name`);
  if (nameIssue) issues.push(nameIssue);
  if (!isIsoDateString(task.start)) {
    issues.push({ path: `${taskPath}/start`, message: "\u6709\u52B9\u306A\u958B\u59CB\u65E5\u3067\u306F\u3042\u308A\u307E\u305B\u3093" });
  }
  if (!isIsoDateString(task.end)) {
    issues.push({ path: `${taskPath}/end`, message: "\u6709\u52B9\u306A\u7D42\u4E86\u65E5\u3067\u306F\u3042\u308A\u307E\u305B\u3093" });
  }
  if (isIsoDateString(task.start) && isIsoDateString(task.end) && task.end < task.start) {
    issues.push({
      path: `${taskPath}/end`,
      message: "\u7D42\u4E86\u65E5\u306F\u958B\u59CB\u65E5\u4EE5\u964D\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059"
    });
  }
  if (taskIds.has(task.id)) {
    issues.push({ path: `${taskPath}/id`, message: "\u30BF\u30B9\u30AF ID \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059" });
  }
  if (milestoneIds.has(task.id)) {
    issues.push({
      path: `${taskPath}/id`,
      message: "\u30BF\u30B9\u30AF ID \u304C\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3 ID \u3068\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
    });
  } else if (milestoneGroupIds.has(task.id)) {
    issues.push({
      path: `${taskPath}/id`,
      message: "\u30BF\u30B9\u30AF ID \u304C\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3\u30B0\u30EB\u30FC\u30D7 ID \u3068\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
    });
  } else if (categoryIds.has(task.id)) {
    issues.push({
      path: `${taskPath}/id`,
      message: "\u30BF\u30B9\u30AF ID \u304C\u30AB\u30C6\u30B4\u30EA ID \u3068\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
    });
  } else if (groupIds.has(task.id)) {
    issues.push({
      path: `${taskPath}/id`,
      message: "\u30BF\u30B9\u30AF ID \u304C\u30B0\u30EB\u30FC\u30D7 ID \u3068\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
    });
  }
  taskIds.add(task.id);
  if (task.note != null && task.note.trim().length === 0) {
    issues.push({ path: `${taskPath}/note`, message: "\u30CE\u30FC\u30C8\u306F\u7A7A\u767D\u306B\u3067\u304D\u307E\u305B\u3093" });
  }
  if (task.colorId != null && task.colorId.trim().length === 0) {
    issues.push({ path: `${taskPath}/colorId`, message: "\u8272 ID \u306F\u7A7A\u767D\u306B\u3067\u304D\u307E\u305B\u3093" });
  }
  const assigneeIssue = validateAssigneeIdsSemantics(taskAssigneeIds(task), taskPath);
  if (assigneeIssue) issues.push(assigneeIssue);
  if (task.todos != null) {
    for (let ti = 0; ti < task.todos.length; ti += 1) {
      const item = task.todos[ti];
      const itemPath = `${taskPath}/todos/${ti}`;
      const trimmed = item.text.trim();
      if (trimmed.length === 0) {
        issues.push({ path: `${itemPath}/text`, message: "\u9805\u76EE\u306E\u6587\u306F\u7A7A\u767D\u306B\u3067\u304D\u307E\u305B\u3093" });
        continue;
      }
      if (item.text !== trimmed) {
        issues.push({
          path: `${itemPath}/text`,
          message: "\u9805\u76EE\u306E\u6587\u306E\u524D\u5F8C\u306B\u7A7A\u767D\u306F\u66F8\u3051\u307E\u305B\u3093"
        });
      }
      if (/[\r\n]/.test(item.text)) {
        issues.push({
          path: `${itemPath}/text`,
          message: "\u9805\u76EE\u306E\u6587\u306B\u6539\u884C\u306F\u66F8\u3051\u307E\u305B\u3093"
        });
      }
    }
  }
  if (task.tags != null) {
    const tagSeen = /* @__PURE__ */ new Set();
    for (let ti = 0; ti < task.tags.length; ti += 1) {
      const tag = task.tags[ti];
      const tagPath = `${taskPath}/tags/${ti}`;
      const trimmed = tag.trim();
      if (trimmed.length === 0) {
        issues.push({ path: tagPath, message: "\u30BF\u30B0\u306F\u7A7A\u767D\u306B\u3067\u304D\u307E\u305B\u3093" });
        continue;
      }
      if (tag !== trimmed) {
        issues.push({
          path: tagPath,
          message: "\u30BF\u30B0\u306E\u524D\u5F8C\u306B\u7A7A\u767D\u306F\u66F8\u3051\u307E\u305B\u3093"
        });
      }
      if (tagSeen.has(trimmed)) {
        issues.push({ path: tagPath, message: "\u30BF\u30B0\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059" });
      }
      tagSeen.add(trimmed);
    }
  }
  if (task.milestoneId != null && !milestoneIds.has(task.milestoneId)) {
    issues.push({
      path: `${taskPath}/milestoneId`,
      message: "\u5B58\u5728\u3057\u306A\u3044\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3 ID \u3067\u3059"
    });
  }
  const predSeen = /* @__PURE__ */ new Set();
  for (let pi = 0; pi < task.predecessors.length; pi += 1) {
    const predId = task.predecessors[pi];
    const predPath = `${taskPath}/predecessors/${pi}`;
    if (predId === task.id) {
      issues.push({ path: predPath, message: "\u81EA\u5206\u81EA\u8EAB\u3092\u5148\u884C\u306B\u6307\u5B9A\u3067\u304D\u307E\u305B\u3093" });
    }
    if (predSeen.has(predId)) {
      issues.push({ path: predPath, message: "\u5148\u884C ID \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059" });
    }
    predSeen.add(predId);
  }
  issues.push(...validateTaskFieldValuesSemantics(task, taskPath, fieldDefs));
  return issues;
}
function taskLocations(doc) {
  const locations = /* @__PURE__ */ new Map();
  for (let ci = 0; ci < doc.categories.length; ci += 1) {
    const category = doc.categories[ci];
    for (let gi = 0; gi < category.groups.length; gi += 1) {
      const group = category.groups[gi];
      for (let ti = 0; ti < group.tasks.length; ti += 1) {
        const task = group.tasks[ti];
        locations.set(task.id, {
          path: `/categories/${ci}/groups/${gi}/tasks/${ti}`,
          label: `${category.name} / ${group.name} / ${task.name}`
        });
      }
    }
  }
  return locations;
}
function validateDependencyCycles(doc) {
  const byId = /* @__PURE__ */ new Map();
  const locations = taskLocations(doc);
  for (const task of collectTasksFromDocument(doc)) {
    byId.set(task.id, task.predecessors);
  }
  const issues = [];
  const visiting = /* @__PURE__ */ new Set();
  const visited = /* @__PURE__ */ new Set();
  const visit = (id, stack) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const cycleStart = stack.indexOf(id);
      const cycle = cycleStart >= 0 ? stack.slice(cycleStart) : [id];
      const first = cycle[0] ?? id;
      const route = cycle.map((taskId) => locations.get(taskId)?.label ?? taskId).join(" \u2192 ");
      issues.push({
        path: locations.get(first)?.path ?? "/categories",
        message: `\u5148\u884C\u95A2\u4FC2\u306B\u5FAA\u74B0\u304C\u3042\u308A\u307E\u3059: ${route}`
      });
      return;
    }
    visiting.add(id);
    stack.push(id);
    for (const pred of byId.get(id) ?? []) {
      visit(pred, stack);
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of byId.keys()) {
    visit(id, []);
  }
  return issues;
}
function validatePredecessorRefs(doc) {
  const taskIds = /* @__PURE__ */ new Set();
  for (const task of collectTasksFromDocument(doc)) {
    taskIds.add(task.id);
  }
  const issues = [];
  const walkOutline = (nodes, basePath) => {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const path = `${basePath}/${i}`;
      if (isTaskNode(node)) {
        for (let pi = 0; pi < node.predecessors.length; pi += 1) {
          const predId = node.predecessors[pi];
          if (!taskIds.has(predId)) {
            issues.push({
              path: `${path}/predecessors/${pi}`,
              message: "\u5B58\u5728\u3057\u306A\u3044\u30BF\u30B9\u30AF ID \u3067\u3059"
            });
          }
        }
        continue;
      }
      walkOutline(node.children, `${path}/children`);
    }
  };
  if (doc.outline != null && doc.outline.length > 0) {
    walkOutline(doc.outline, "/outline");
    return issues;
  }
  for (let ci = 0; ci < doc.categories.length; ci += 1) {
    const category = doc.categories[ci];
    for (let gi = 0; gi < category.groups.length; gi += 1) {
      const group = category.groups[gi];
      for (let ti = 0; ti < group.tasks.length; ti += 1) {
        const task = group.tasks[ti];
        const taskPath = `/categories/${ci}/groups/${gi}/tasks/${ti}`;
        for (let pi = 0; pi < task.predecessors.length; pi += 1) {
          const predId = task.predecessors[pi];
          if (!taskIds.has(predId)) {
            issues.push({
              path: `${taskPath}/predecessors/${pi}`,
              message: "\u5B58\u5728\u3057\u306A\u3044\u30BF\u30B9\u30AF ID \u3067\u3059"
            });
          }
        }
      }
    }
  }
  return issues;
}

// src/model/connections.ts
function connectionPairKey(a, b) {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}
function validateConnections(doc) {
  const connections = doc.connections;
  if (connections == null || connections.length === 0) return [];
  const taskIds = new Set(
    collectTasksFromDocument(doc).map((task) => task.id)
  );
  const issues = [];
  const seenPairs = /* @__PURE__ */ new Set();
  for (let i = 0; i < connections.length; i += 1) {
    const connection = connections[i];
    const base = `/connections/${i}`;
    const [a, b] = connection.taskIds;
    if (a === b) {
      issues.push({
        path: `${base}/taskIds`,
        message: "\u540C\u3058\u30BF\u30B9\u30AF\u540C\u58EB\u306F\u6307\u5B9A\u3067\u304D\u307E\u305B\u3093"
      });
      continue;
    }
    if (!taskIds.has(a)) {
      issues.push({
        path: `${base}/taskIds/0`,
        message: "\u5B58\u5728\u3057\u306A\u3044\u30BF\u30B9\u30AF ID \u3067\u3059"
      });
    }
    if (!taskIds.has(b)) {
      issues.push({
        path: `${base}/taskIds/1`,
        message: "\u5B58\u5728\u3057\u306A\u3044\u30BF\u30B9\u30AF ID \u3067\u3059"
      });
    }
    const pair = connectionPairKey(a, b);
    if (seenPairs.has(pair)) {
      issues.push({
        path: base,
        message: "\u540C\u30582\u3064\u306E\u30BF\u30B9\u30AF\u306E\u7E4B\u304C\u308A\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
      });
    } else {
      seenPairs.add(pair);
    }
    if (connection.label.trim().length === 0) {
      issues.push({
        path: `${base}/label`,
        message: "label \u306F\u7A7A\u767D\u306B\u3067\u304D\u307E\u305B\u3093"
      });
    }
  }
  return issues;
}

// src/model/taskTodos.ts
function progressFromTodoItems(items) {
  if (items.length === 0) return 0;
  const done = items.filter((item) => item.done).length;
  if (done === items.length) return 100;
  return Math.floor(done / items.length * 100);
}
function normalizeTaskTodos(items) {
  if (items == null || items.length === 0) return void 0;
  const result2 = [];
  for (const item of items) {
    const text2 = item.text.trim();
    if (text2.length === 0) continue;
    if (/[\r\n]/.test(item.text)) continue;
    result2.push({ text: text2, done: item.done });
  }
  return result2.length > 0 ? result2 : void 0;
}
function normalizeTaskWithTodos(task) {
  const todos = normalizeTaskTodos(task.todos);
  if (todos === void 0) {
    if (task.todos === void 0) return task;
    const next = { ...task };
    delete next.todos;
    return next;
  }
  const progress = progressFromTodoItems(todos);
  if (task.todos === todos && task.progress === progress) return task;
  return { ...task, todos, progress };
}
function normalizeOutlineNode(node) {
  if (isTaskNode(node)) return normalizeTaskWithTodos(node);
  return {
    ...node,
    children: node.children.map((child) => normalizeOutlineNode(child))
  };
}
function normalizeScheduleDocument(doc) {
  const categories = doc.categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.map((task) => normalizeTaskWithTodos(task))
    }))
  }));
  const outline = doc.outline != null ? doc.outline.map((node) => normalizeOutlineNode(node)) : doc.outline;
  return { ...doc, categories, outline, connections: doc.connections };
}

// src/model/validationMessages.ts
var AJV_JA = {
  "must be integer": "\u6574\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
  "must be string": "\u6587\u5B57\u5217\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
  "must be number": "\u6570\u5024\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
  "must be object": "\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
  "must be array": "\u914D\u5217\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
  "must NOT have fewer than 1 items": "1 \u4EF6\u4EE5\u4E0A\u5FC5\u8981\u3067\u3059",
  "must NOT have additional properties": "\u672A\u77E5\u306E\u30D7\u30ED\u30D1\u30C6\u30A3\u306F\u8A31\u53EF\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
  'must match format "date"': "\u65E5\u4ED8\u306E\u5F62\u5F0F\uFF08YYYY-MM-DD\uFF09\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
  'must match format "uuid"': "UUID \u306E\u5F62\u5F0F\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
  "must be >= 0": "0 \u4EE5\u4E0A\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
  "must be <= 100": "100 \u4EE5\u4E0B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059"
};
var FIELD_LABELS = {
  name: "\u540D\u524D",
  start: "\u958B\u59CB\u65E5",
  end: "\u7D42\u4E86\u65E5",
  progress: "\u9032\u6357\u7387",
  confidence: "\u78BA\u5EA6",
  assigneeId: "\u62C5\u5F53\u8005",
  status: "\u72B6\u614B",
  predecessors: "\u5148\u884C\u30BF\u30B9\u30AF",
  milestoneId: "\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3",
  tags: "\u30BF\u30B0",
  date: "\u65E5\u4ED8",
  title: "\u30BF\u30A4\u30C8\u30EB",
  schemaVersion: "\u30B9\u30AD\u30FC\u30DE\u30D0\u30FC\u30B8\u30E7\u30F3",
  id: "ID",
  milestones: "\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3",
  categories: "\u30AB\u30C6\u30B4\u30EA",
  groups: "\u30B0\u30EB\u30FC\u30D7",
  tasks: "\u30BF\u30B9\u30AF"
};
function fieldLabel(name) {
  return FIELD_LABELS[name] ?? name;
}
function localizeAjvMessage(message) {
  if (!message) return "\u30B9\u30AD\u30FC\u30DE\u9055\u53CD";
  return AJV_JA[message] ?? message;
}
function localizeAjvError(error) {
  const params = error.params;
  switch (error.keyword) {
    case "type":
      return localizeAjvMessage(
        typeof params.type === "string" ? `must be ${params.type}` : error.message
      );
    case "required":
      return `\u5FC5\u9808\u9805\u76EE\u300C${fieldLabel(String(params.missingProperty ?? ""))}\u300D\u304C\u3042\u308A\u307E\u305B\u3093`;
    case "const":
      return `${String(params.allowedValue ?? "")} \u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
    case "enum":
      return "\u8A31\u53EF\u3055\u308C\u305F\u5024\u306E\u3044\u305A\u308C\u304B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059";
    case "minLength":
      return `${String(params.limit ?? 1)} \u6587\u5B57\u4EE5\u4E0A\u5FC5\u8981\u3067\u3059`;
    case "minimum":
      return `${String(params.limit ?? 0)} \u4EE5\u4E0A\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
    case "maximum":
      return `${String(params.limit ?? 0)} \u4EE5\u4E0B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
    case "minItems":
      return `${String(params.limit ?? 1)} \u4EF6\u4EE5\u4E0A\u5FC5\u8981\u3067\u3059`;
    case "format":
      return localizeAjvMessage(
        typeof params.format === "string" ? `must match format "${params.format}"` : error.message
      );
    case "additionalProperties":
      return "\u672A\u77E5\u306E\u30D7\u30ED\u30D1\u30C6\u30A3\u306F\u8A31\u53EF\u3055\u308C\u3066\u3044\u307E\u305B\u3093";
    default:
      return localizeAjvMessage(error.message);
  }
}
function readAtPath(data2, segments) {
  let current = data2;
  for (const segment of segments) {
    if (current == null || typeof current !== "object") return void 0;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return void 0;
      current = current[index];
      continue;
    }
    current = current[segment];
  }
  return current;
}
function humanizeInstancePath(data2, instancePath) {
  if (!instancePath || instancePath === "/") return "\u6587\u66F8";
  const segments = instancePath.split("/").filter(Boolean);
  const parts = [];
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (segment === "categories" && segments[i + 1] !== void 0) {
      const cat = readAtPath(data2, segments.slice(0, i + 2));
      const name = cat && typeof cat === "object" && "name" in cat ? String(cat.name) : `\u30AB\u30C6\u30B4\u30EA ${segments[i + 1]}`;
      parts.push(`\u30AB\u30C6\u30B4\u30EA\u300C${name}\u300D`);
      i += 1;
      continue;
    }
    if (segment === "groups" && segments[i + 1] !== void 0) {
      const group = readAtPath(data2, segments.slice(0, i + 2));
      const name = group && typeof group === "object" && "name" in group ? String(group.name) : `\u30B0\u30EB\u30FC\u30D7 ${segments[i + 1]}`;
      parts.push(`\u30B0\u30EB\u30FC\u30D7\u300C${name}\u300D`);
      i += 1;
      continue;
    }
    if (segment === "tasks" && segments[i + 1] !== void 0) {
      const task = readAtPath(data2, segments.slice(0, i + 2));
      const name = task && typeof task === "object" && "name" in task ? String(task.name) : `\u30BF\u30B9\u30AF ${segments[i + 1]}`;
      parts.push(`\u30BF\u30B9\u30AF\u300C${name}\u300D`);
      i += 1;
      continue;
    }
    if (segment === "milestones" && segments[i + 1] !== void 0) {
      const milestone = readAtPath(data2, segments.slice(0, i + 2));
      const name = milestone && typeof milestone === "object" && "name" in milestone ? String(milestone.name) : `\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3 ${segments[i + 1]}`;
      parts.push(`\u30DE\u30A4\u30EB\u30B9\u30C8\u30F3\u300C${name}\u300D`);
      i += 1;
      continue;
    }
    parts.push(fieldLabel(segment));
  }
  return parts.join(" / ");
}
function formatAjvErrors(data2, errors) {
  if (!errors) return [];
  return errors.map((error) => ({
    path: humanizeInstancePath(data2, error.instancePath || "/"),
    message: localizeAjvError(error)
  }));
}
function formatValidationErrors2(errors) {
  return errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
}

// src/model/validateSchedule.ts
function isRecord3(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function normalizeScheduleLevelsInputForSchema(data2) {
  if (!isRecord3(data2) || !Array.isArray(data2.levels)) return data2;
  const levels = data2.levels.map((entry) => {
    if (!isRecord3(entry) || !("instruction" in entry)) return entry;
    const instruction = entry.instruction;
    if (typeof instruction !== "string" || instruction.trim().length > 0) {
      return entry;
    }
    const { instruction: _removed, ...rest } = entry;
    void _removed;
    return rest;
  });
  return { ...data2, levels };
}
function validateSchedule(data2) {
  const afterV1 = migrateScheduleToV2(data2);
  if (afterV1 != null && typeof afterV1 === "object" && !Array.isArray(afterV1) && afterV1.schemaVersion === 2) {
    return {
      ok: false,
      errors: [
        {
          path: "/schemaVersion",
          message: "schemaVersion 2\uFF08\u62C5\u5F53\u8005\u540D assignee\uFF09\u306F\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3002assigneeId \u3068 confidence \u3092\u4F7F\u3046 schemaVersion 8 \u306B\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        }
      ]
    };
  }
  const migrated = migrateScheduleV7ToV8(
    migrateScheduleV6ToV7(
      migrateScheduleV5ToV6(
        fillMissingMilestoneConfidence(
          migrateScheduleV4ToV5(migrateScheduleV3ToV4(afterV1))
        )
      )
    )
  );
  const forSchema = normalizeScheduleFieldsForValidation(
    normalizeScheduleLevelsInputForSchema(migrated)
  );
  const assigneeInputIssues = validateAssigneeIdInputSemantics(forSchema);
  if (assigneeInputIssues.length > 0) {
    return {
      ok: false,
      errors: assigneeInputIssues.map((issue) => ({
        ...issue,
        path: humanizeInstancePath(migrated, issue.path)
      }))
    };
  }
  const forSchemaAssignees = scheduleInputForSchemaValidation(forSchema);
  if (!scheduleValidator_default(forSchemaAssignees)) {
    return {
      ok: false,
      errors: formatAjvErrors(forSchemaAssignees, scheduleValidator_default.errors)
    };
  }
  const raw = forSchemaAssignees;
  const withCategories = {
    ...raw,
    categories: raw.categories ?? []
  };
  const document = normalizeAssigneesInDocument(withCategories);
  const errors = [
    ...validateScheduleSemantics(document),
    ...validatePredecessorRefs(document),
    ...validateDependencyCycles(document),
    ...validateConnections(document)
  ];
  if (errors.length > 0) {
    return {
      ok: false,
      errors: errors.map((issue) => ({
        ...issue,
        path: humanizeInstancePath(migrated, issue.path)
      }))
    };
  }
  return { ok: true, document: normalizeScheduleDocument(document) };
}
function formatValidationErrors(errors) {
  return formatValidationErrors2(errors);
}

// scripts/validate-schedule-cli.ts
var file = process.argv[2];
if (!file) {
  console.error("Usage: validate-schedule <path-to.json>");
  process.exit(1);
}
var text = readFileSync(resolve(file), "utf8").replace(/^\uFEFF/, "");
var data;
try {
  data = JSON.parse(text);
} catch {
  console.error("JSON \u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
  process.exit(1);
}
var result = validateSchedule(data);
if (!result.ok) {
  console.error(formatValidationErrors(result.errors));
  process.exit(1);
}
console.log("OK");
