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

// scripts/validate-calendar-cli.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// src/model/generated/calendarValidator.js
var import_equal = __toESM(require_equal(), 1);
var import_formats = __toESM(require_formats(), 1);
var import_ucs2length = __toESM(require_ucs2length(), 1);
function __standaloneValue(mod, path) {
  const read = (root) => path.reduce((current, key) => current?.[key], root);
  if (path.length === 1 && path[0] === "default" && typeof mod === "function") return mod;
  const direct = read(mod);
  return direct === void 0 ? read(mod?.default) : direct;
}
var calendarValidator_default = validate20;
var schema32 = { "type": "string", "enum": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] };
var func0 = __standaloneValue(import_equal.default, ["default"]);
var formats0 = __standaloneValue(import_formats.default, ["fullFormats", "date"]);
var func2 = __standaloneValue(import_ucs2length.default, ["default"]);
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
    if (data2.date === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "date" }, message: "must have required property 'date'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "date" || key0 === "name")) {
        const err1 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data2.date !== void 0) {
      let data0 = data2.date;
      if (typeof data0 === "string") {
        if (!formats0.validate(data0)) {
          const err2 = { instancePath: instancePath + "/date", schemaPath: "#/$defs/isoDate/format", keyword: "format", params: { format: "date" }, message: 'must match format "date"' };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
      } else {
        const err3 = { instancePath: instancePath + "/date", schemaPath: "#/$defs/isoDate/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data2.name !== void 0) {
      let data1 = data2.name;
      if (typeof data1 === "string") {
        if (func2(data1) < 1) {
          const err4 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
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
  validate21.errors = vErrors;
  return errors === 0;
}
validate21.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
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
    if (data2.weekends === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "weekends" }, message: "must have required property 'weekends'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data2.nonWorkingDays === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "nonWorkingDays" }, message: "must have required property 'nonWorkingDays'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data2.workingDays === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "workingDays" }, message: "must have required property 'workingDays'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "schemaVersion" || key0 === "weekends" || key0 === "nonWorkingDays" || key0 === "workingDays")) {
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
      if (1 !== data0) {
        const err6 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/const", keyword: "const", params: { allowedValue: 1 }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data2.weekends !== void 0) {
      let data1 = data2.weekends;
      if (Array.isArray(data1)) {
        const len0 = data1.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data22 = data1[i0];
          if (typeof data22 !== "string") {
            const err7 = { instancePath: instancePath + "/weekends/" + i0, schemaPath: "#/$defs/weekday/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
          if (!(data22 === "sun" || data22 === "mon" || data22 === "tue" || data22 === "wed" || data22 === "thu" || data22 === "fri" || data22 === "sat")) {
            const err8 = { instancePath: instancePath + "/weekends/" + i0, schemaPath: "#/$defs/weekday/enum", keyword: "enum", params: { allowedValues: schema32.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err8];
            } else {
              vErrors.push(err8);
            }
            errors++;
          }
        }
        let i1 = data1.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func0(data1[i1], data1[j0])) {
                const err9 = { instancePath: instancePath + "/weekends", schemaPath: "#/properties/weekends/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err9];
                } else {
                  vErrors.push(err9);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err10 = { instancePath: instancePath + "/weekends", schemaPath: "#/properties/weekends/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data2.nonWorkingDays !== void 0) {
      let data3 = data2.nonWorkingDays;
      if (Array.isArray(data3)) {
        const len1 = data3.length;
        for (let i2 = 0; i2 < len1; i2++) {
          if (!validate21(data3[i2], { instancePath: instancePath + "/nonWorkingDays/" + i2, parentData: data3, parentDataProperty: i2, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err11 = { instancePath: instancePath + "/nonWorkingDays", schemaPath: "#/properties/nonWorkingDays/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data2.workingDays !== void 0) {
      let data5 = data2.workingDays;
      if (Array.isArray(data5)) {
        const len2 = data5.length;
        for (let i3 = 0; i3 < len2; i3++) {
          if (!validate21(data5[i3], { instancePath: instancePath + "/workingDays/" + i3, parentData: data5, parentDataProperty: i3, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err12 = { instancePath: instancePath + "/workingDays", schemaPath: "#/properties/workingDays/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
  } else {
    const err13 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err13];
    } else {
      vErrors.push(err13);
    }
    errors++;
  }
  validate20.errors = vErrors;
  return errors === 0;
}
validate20.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };

// src/model/dates.ts
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

// src/model/calendarSemantics.ts
function validateDatedEntries(entries, basePath, label) {
  const issues = [];
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const path = `${basePath}/${i}/date`;
    if (!isIsoDateString(entry.date)) {
      issues.push({
        path,
        message: `${label}\u306E date \u306F\u5B9F\u5728\u3059\u308B YYYY-MM-DD \u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`
      });
    }
    if (seen.has(entry.date)) {
      issues.push({
        path,
        message: `${label}\u306E date \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`
      });
    }
    seen.add(entry.date);
  }
  return issues;
}
function validateCalendarSemantics(doc) {
  const issues = [];
  issues.push(
    ...validateDatedEntries(doc.nonWorkingDays, "/nonWorkingDays", "\u4F11\u65E5")
  );
  issues.push(
    ...validateDatedEntries(doc.workingDays, "/workingDays", "\u632F\u66FF\u51FA\u52E4")
  );
  const working = new Set(doc.workingDays.map((e) => e.date));
  for (let i = 0; i < doc.nonWorkingDays.length; i += 1) {
    const date = doc.nonWorkingDays[i].date;
    if (working.has(date)) {
      issues.push({
        path: `/nonWorkingDays/${i}/date`,
        message: "\u540C\u3058\u65E5\u4ED8\u304C\u632F\u66FF\u51FA\u52E4\u306B\u3082\u3042\u308A\u307E\u3059"
      });
    }
  }
  return issues;
}

// src/model/calendarTypes.ts
var CALENDAR_SCHEMA_VERSION = 1;

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

// src/model/validateCalendar.ts
function validateCalendar(data2) {
  if (!calendarValidator_default(data2)) {
    return {
      ok: false,
      errors: formatAjvErrors(data2, calendarValidator_default.errors)
    };
  }
  const document = data2;
  if (document.schemaVersion !== CALENDAR_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        {
          path: "/schemaVersion",
          message: `\u30AB\u30EC\u30F3\u30C0\u30FC JSON \u306E schemaVersion \u306F ${CALENDAR_SCHEMA_VERSION} \u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`
        }
      ]
    };
  }
  const errors = validateCalendarSemantics(document);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, document };
}
function formatCalendarValidationErrors(errors) {
  return formatValidationErrors(errors);
}

// scripts/validate-calendar-cli.ts
var file = process.argv[2];
if (!file) {
  console.error("Usage: validate-calendar <path-to.json>");
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
var result = validateCalendar(data);
if (!result.ok) {
  console.error(formatCalendarValidationErrors(result.errors));
  process.exit(1);
}
console.log("OK");
