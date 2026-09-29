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
var formats2 = __standaloneValue(import_formats.default, ["fullFormats", "date"]);
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
    if (data2.date === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "date" }, message: "must have required property 'date'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "id" || key0 === "name" || key0 === "date")) {
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
    if (data2.date !== void 0) {
      let data22 = data2.date;
      if (typeof data22 === "string") {
        if (!formats2.validate(data22)) {
          const err8 = { instancePath: instancePath + "/date", schemaPath: "#/$defs/isoDate/format", keyword: "format", params: { format: "date" }, message: 'must match format "date"' };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
      } else {
        const err9 = { instancePath: instancePath + "/date", schemaPath: "#/$defs/isoDate/type", keyword: "type", params: { type: "string" }, message: "must be string" };
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
  validate21.errors = vErrors;
  return errors === 0;
}
validate21.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema37 = { "type": "object", "additionalProperties": false, "required": ["id", "name", "start", "end", "assigneeId", "status", "progress", "confidence", "predecessors", "milestoneId"], "properties": { "id": { "$ref": "#/$defs/scheduleId" }, "name": { "type": "string", "minLength": 1 }, "start": { "$ref": "#/$defs/isoDate" }, "end": { "$ref": "#/$defs/isoDate", "description": "\u7D42\u4E86\u65E5\uFF08\u3053\u306E\u65E5\u3092\u542B\u3080\uFF09\u3002\u958B\u59CB\u65E5\u4EE5\u964D\u3002" }, "assigneeId": { "oneOf": [{ "type": "string", "minLength": 1 }, { "type": "null" }] }, "status": { "$ref": "#/$defs/taskStatus" }, "progress": { "type": "integer", "minimum": 0, "maximum": 100 }, "confidence": { "type": "string", "enum": ["tentative", "committed"], "description": "\u65E5\u4ED8\u3092\u5408\u610F\u3057\u305F\u304B\u3069\u3046\u304B\u3002\u7740\u624B\u3084\u9032\u6357\u3068\u306F\u72EC\u7ACB\u3002tentative \u306F\u672A\u78BA\u5B9A\u3001committed \u306F\u78BA\u5B9A\u3002" }, "predecessors": { "type": "array", "items": { "$ref": "#/$defs/scheduleId" }, "uniqueItems": true }, "milestoneId": { "oneOf": [{ "$ref": "#/$defs/scheduleId" }, { "type": "null" }] }, "note": { "type": "string", "minLength": 1, "description": "\u30BF\u30B9\u30AF\u306E\u88DC\u8DB3\u8AAC\u660E\uFF08\u4EFB\u610F\uFF09\u3002\u753B\u9762\u3067\u306F\u30CE\u30FC\u30C8\u3068\u3057\u3066\u8868\u793A\u3059\u308B\u3002" } } };
var schema41 = { "type": "string", "enum": ["not-started", "in-progress", "done"] };
var func5 = Object.prototype.hasOwnProperty;
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
      if (!func5.call(schema37.properties, key0)) {
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
        if (!formats2.validate(data22)) {
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
        if (!formats2.validate(data3)) {
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
      if (typeof data4 === "string") {
        if (func1(data4) < 1) {
          const err19 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/0/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err19];
          } else {
            vErrors.push(err19);
          }
          errors++;
        }
      } else {
        const err20 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/0/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err20];
        } else {
          vErrors.push(err20);
        }
        errors++;
      }
      var _valid0 = _errs15 === errors;
      if (_valid0) {
        valid4 = true;
        passing0 = 0;
      }
      const _errs17 = errors;
      if (data4 !== null) {
        const err21 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf/1/type", keyword: "type", params: { type: "null" }, message: "must be null" };
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
      }
      if (!valid4) {
        const err22 = { instancePath: instancePath + "/assigneeId", schemaPath: "#/properties/assigneeId/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
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
      let data5 = data2.status;
      if (typeof data5 !== "string") {
        const err23 = { instancePath: instancePath + "/status", schemaPath: "#/$defs/taskStatus/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err23];
        } else {
          vErrors.push(err23);
        }
        errors++;
      }
      if (!(data5 === "not-started" || data5 === "in-progress" || data5 === "done")) {
        const err24 = { instancePath: instancePath + "/status", schemaPath: "#/$defs/taskStatus/enum", keyword: "enum", params: { allowedValues: schema41.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data2.progress !== void 0) {
      let data6 = data2.progress;
      if (!(typeof data6 == "number" && (!(data6 % 1) && !isNaN(data6)))) {
        const err25 = { instancePath: instancePath + "/progress", schemaPath: "#/properties/progress/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
      if (typeof data6 == "number") {
        if (data6 > 100 || isNaN(data6)) {
          const err26 = { instancePath: instancePath + "/progress", schemaPath: "#/properties/progress/maximum", keyword: "maximum", params: { comparison: "<=", limit: 100 }, message: "must be <= 100" };
          if (vErrors === null) {
            vErrors = [err26];
          } else {
            vErrors.push(err26);
          }
          errors++;
        }
        if (data6 < 0 || isNaN(data6)) {
          const err27 = { instancePath: instancePath + "/progress", schemaPath: "#/properties/progress/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
          if (vErrors === null) {
            vErrors = [err27];
          } else {
            vErrors.push(err27);
          }
          errors++;
        }
      }
    }
    if (data2.confidence !== void 0) {
      let data7 = data2.confidence;
      if (typeof data7 !== "string") {
        const err28 = { instancePath: instancePath + "/confidence", schemaPath: "#/properties/confidence/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err28];
        } else {
          vErrors.push(err28);
        }
        errors++;
      }
      if (!(data7 === "tentative" || data7 === "committed")) {
        const err29 = { instancePath: instancePath + "/confidence", schemaPath: "#/properties/confidence/enum", keyword: "enum", params: { allowedValues: schema37.properties.confidence.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err29];
        } else {
          vErrors.push(err29);
        }
        errors++;
      }
    }
    if (data2.predecessors !== void 0) {
      let data8 = data2.predecessors;
      if (Array.isArray(data8)) {
        const len0 = data8.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data9 = data8[i0];
          if (typeof data9 === "string") {
            if (!formats0.test(data9)) {
              const err30 = { instancePath: instancePath + "/predecessors/" + i0, schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
              if (vErrors === null) {
                vErrors = [err30];
              } else {
                vErrors.push(err30);
              }
              errors++;
            }
          } else {
            const err31 = { instancePath: instancePath + "/predecessors/" + i0, schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err31];
            } else {
              vErrors.push(err31);
            }
            errors++;
          }
        }
        let i1 = data8.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func0(data8[i1], data8[j0])) {
                const err32 = { instancePath: instancePath + "/predecessors", schemaPath: "#/properties/predecessors/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err32];
                } else {
                  vErrors.push(err32);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err33 = { instancePath: instancePath + "/predecessors", schemaPath: "#/properties/predecessors/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err33];
        } else {
          vErrors.push(err33);
        }
        errors++;
      }
    }
    if (data2.milestoneId !== void 0) {
      let data10 = data2.milestoneId;
      const _errs32 = errors;
      let valid10 = false;
      let passing1 = null;
      const _errs33 = errors;
      if (typeof data10 === "string") {
        if (!formats0.test(data10)) {
          const err34 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
          if (vErrors === null) {
            vErrors = [err34];
          } else {
            vErrors.push(err34);
          }
          errors++;
        }
      } else {
        const err35 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err35];
        } else {
          vErrors.push(err35);
        }
        errors++;
      }
      var _valid1 = _errs33 === errors;
      if (_valid1) {
        valid10 = true;
        passing1 = 0;
      }
      const _errs36 = errors;
      if (data10 !== null) {
        const err36 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/properties/milestoneId/oneOf/1/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err36];
        } else {
          vErrors.push(err36);
        }
        errors++;
      }
      var _valid1 = _errs36 === errors;
      if (_valid1 && valid10) {
        valid10 = false;
        passing1 = [passing1, 1];
      } else {
        if (_valid1) {
          valid10 = true;
          passing1 = 1;
        }
      }
      if (!valid10) {
        const err37 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/properties/milestoneId/oneOf", keyword: "oneOf", params: { passingSchemas: passing1 }, message: "must match exactly one schema in oneOf" };
        if (vErrors === null) {
          vErrors = [err37];
        } else {
          vErrors.push(err37);
        }
        errors++;
      } else {
        errors = _errs32;
        if (vErrors !== null) {
          if (_errs32) {
            vErrors.length = _errs32;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data2.note !== void 0) {
      let data11 = data2.note;
      if (typeof data11 === "string") {
        if (func1(data11) < 1) {
          const err38 = { instancePath: instancePath + "/note", schemaPath: "#/properties/note/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err38];
          } else {
            vErrors.push(err38);
          }
          errors++;
        }
      } else {
        const err39 = { instancePath: instancePath + "/note", schemaPath: "#/properties/note/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err39];
        } else {
          vErrors.push(err39);
        }
        errors++;
      }
    }
  } else {
    const err40 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err40];
    } else {
      vErrors.push(err40);
    }
    errors++;
  }
  validate25.errors = vErrors;
  return errors === 0;
}
validate25.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate24(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate24.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
    if (data2.name === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data2.tasks === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "tasks" }, message: "must have required property 'tasks'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "name" || key0 === "tasks")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data2.name !== void 0) {
      let data0 = data2.name;
      if (typeof data0 === "string") {
        if (func1(data0) < 1) {
          const err3 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
      } else {
        const err4 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data2.tasks !== void 0) {
      let data1 = data2.tasks;
      if (Array.isArray(data1)) {
        const len0 = data1.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate25(data1[i0], { instancePath: instancePath + "/tasks/" + i0, parentData: data1, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err5 = { instancePath: instancePath + "/tasks", schemaPath: "#/properties/tasks/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
  } else {
    const err6 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err6];
    } else {
      vErrors.push(err6);
    }
    errors++;
  }
  validate24.errors = vErrors;
  return errors === 0;
}
validate24.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
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
    if (data2.name === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data2.groups === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "groups" }, message: "must have required property 'groups'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "name" || key0 === "groups")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data2.name !== void 0) {
      let data0 = data2.name;
      if (typeof data0 === "string") {
        if (func1(data0) < 1) {
          const err3 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
      } else {
        const err4 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data2.groups !== void 0) {
      let data1 = data2.groups;
      if (Array.isArray(data1)) {
        if (data1.length < 1) {
          const err5 = { instancePath: instancePath + "/groups", schemaPath: "#/properties/groups/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        const len0 = data1.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate24(data1[i0], { instancePath: instancePath + "/groups/" + i0, parentData: data1, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err6 = { instancePath: instancePath + "/groups", schemaPath: "#/properties/groups/type", keyword: "type", params: { type: "array" }, message: "must be array" };
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
  validate23.errors = vErrors;
  return errors === 0;
}
validate23.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
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
    if (data2.milestones === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "milestones" }, message: "must have required property 'milestones'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data2.categories === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "categories" }, message: "must have required property 'categories'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "schemaVersion" || key0 === "title" || key0 === "milestones" || key0 === "categories")) {
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
      if (4 !== data0) {
        const err6 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/const", keyword: "const", params: { allowedValue: 4 }, message: "must be equal to constant" };
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
    if (data2.milestones !== void 0) {
      let data22 = data2.milestones;
      if (Array.isArray(data22)) {
        const len0 = data22.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate21(data22[i0], { instancePath: instancePath + "/milestones/" + i0, parentData: data22, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err9 = { instancePath: instancePath + "/milestones", schemaPath: "#/properties/milestones/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data2.categories !== void 0) {
      let data4 = data2.categories;
      if (Array.isArray(data4)) {
        if (data4.length < 1) {
          const err10 = { instancePath: instancePath + "/categories", schemaPath: "#/properties/categories/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        const len1 = data4.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate23(data4[i1], { instancePath: instancePath + "/categories/" + i1, parentData: data4, parentDataProperty: i1, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err11 = { instancePath: instancePath + "/categories", schemaPath: "#/properties/categories/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
  } else {
    const err12 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err12];
    } else {
      vErrors.push(err12);
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
    milestoneIds.add(milestone.id);
  }
  const taskIds = /* @__PURE__ */ new Set();
  const categoryNames = /* @__PURE__ */ new Set();
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
      for (let ti = 0; ti < group.tasks.length; ti += 1) {
        const task = group.tasks[ti];
        const taskPath = `${groupPath}/tasks/${ti}`;
        issues.push(...validateTaskSemantics(task, taskPath, taskIds, milestoneIds));
      }
    }
  }
  return issues;
}
function validateTaskSemantics(task, taskPath, taskIds, milestoneIds) {
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
  }
  taskIds.add(task.id);
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
  return issues;
}
function validateDependencyCycles(doc) {
  const byId = /* @__PURE__ */ new Map();
  for (const category of doc.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        byId.set(task.id, task.predecessors);
      }
    }
  }
  const issues = [];
  const visiting = /* @__PURE__ */ new Set();
  const visited = /* @__PURE__ */ new Set();
  const visit = (id, stack) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const cycleStart = stack.indexOf(id);
      const cycle = cycleStart >= 0 ? stack.slice(cycleStart) : [id];
      issues.push({
        path: "/categories",
        message: `\u5148\u884C\u95A2\u4FC2\u306B\u5FAA\u74B0\u304C\u3042\u308A\u307E\u3059: ${cycle.join(" \u2192 ")}`
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
  for (const category of doc.categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        taskIds.add(task.id);
      }
    }
  }
  const issues = [];
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
function formatValidationErrors(errors) {
  return errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
}

// src/model/validateSchedule.ts
function validateSchedule(data2) {
  const afterV1 = migrateScheduleToV2(data2);
  if (afterV1 != null && typeof afterV1 === "object" && !Array.isArray(afterV1) && afterV1.schemaVersion === 2) {
    return {
      ok: false,
      errors: [
        {
          path: "/schemaVersion",
          message: "schemaVersion 2\uFF08\u62C5\u5F53\u8005\u540D assignee\uFF09\u306F\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3002assigneeId \u3068 confidence \u3092\u4F7F\u3046 schemaVersion 4 \u306B\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        }
      ]
    };
  }
  const migrated = migrateScheduleV3ToV4(afterV1);
  if (!scheduleValidator_default(migrated)) {
    return {
      ok: false,
      errors: formatAjvErrors(migrated, scheduleValidator_default.errors)
    };
  }
  const document = migrated;
  const errors = [
    ...validateScheduleSemantics(document),
    ...validatePredecessorRefs(document),
    ...validateDependencyCycles(document)
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
  return { ok: true, document };
}
function formatValidationErrors2(errors) {
  return formatValidationErrors(errors);
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
  console.error(formatValidationErrors2(result.errors));
  process.exit(1);
}
console.log("OK");
