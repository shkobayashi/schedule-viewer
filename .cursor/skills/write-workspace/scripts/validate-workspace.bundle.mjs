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

// scripts/validate-workspace-cli.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// src/model/generated/workspaceValidator.js
var import_ucs2length = __toESM(require_ucs2length(), 1);
function __standaloneValue(mod, path) {
  const read = (root) => path.reduce((current, key) => current?.[key], root);
  if (path.length === 1 && path[0] === "default" && typeof mod === "function") return mod;
  const direct = read(mod);
  return direct === void 0 ? read(mod?.default) : direct;
}
var workspaceValidator_default = validate20;
var func1 = __standaloneValue(import_ucs2length.default, ["default"]);
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
    if (data2.schedule === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "schedule" }, message: "must have required property 'schedule'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "schemaVersion" || key0 === "schedule" || key0 === "members" || key0 === "calendar" || key0 === "statuses" || key0 === "fieldExtensions" || key0 === "editableFieldExtension")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data2.schemaVersion !== void 0) {
      let data0 = data2.schemaVersion;
      if (!(typeof data0 == "number" && (!(data0 % 1) && !isNaN(data0)))) {
        const err3 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      if (1 !== data0) {
        const err4 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/const", keyword: "const", params: { allowedValue: 1 }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data2.schedule !== void 0) {
      let data1 = data2.schedule;
      if (typeof data1 === "string") {
        if (func1(data1) < 1) {
          const err5 = { instancePath: instancePath + "/schedule", schemaPath: "#/properties/schedule/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
      } else {
        const err6 = { instancePath: instancePath + "/schedule", schemaPath: "#/properties/schedule/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data2.members !== void 0) {
      let data22 = data2.members;
      if (typeof data22 === "string") {
        if (func1(data22) < 1) {
          const err7 = { instancePath: instancePath + "/members", schemaPath: "#/properties/members/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
      } else {
        const err8 = { instancePath: instancePath + "/members", schemaPath: "#/properties/members/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data2.calendar !== void 0) {
      let data3 = data2.calendar;
      if (typeof data3 === "string") {
        if (func1(data3) < 1) {
          const err9 = { instancePath: instancePath + "/calendar", schemaPath: "#/properties/calendar/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
      } else {
        const err10 = { instancePath: instancePath + "/calendar", schemaPath: "#/properties/calendar/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data2.statuses !== void 0) {
      let data4 = data2.statuses;
      if (typeof data4 === "string") {
        if (func1(data4) < 1) {
          const err11 = { instancePath: instancePath + "/statuses", schemaPath: "#/properties/statuses/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
      } else {
        const err12 = { instancePath: instancePath + "/statuses", schemaPath: "#/properties/statuses/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
    if (data2.fieldExtensions !== void 0) {
      let data5 = data2.fieldExtensions;
      if (Array.isArray(data5)) {
        if (data5.length < 1) {
          const err13 = { instancePath: instancePath + "/fieldExtensions", schemaPath: "#/properties/fieldExtensions/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err13];
          } else {
            vErrors.push(err13);
          }
          errors++;
        }
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data6 = data5[i0];
          if (typeof data6 === "string") {
            if (func1(data6) < 1) {
              const err14 = { instancePath: instancePath + "/fieldExtensions/" + i0, schemaPath: "#/properties/fieldExtensions/items/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err14];
              } else {
                vErrors.push(err14);
              }
              errors++;
            }
          } else {
            const err15 = { instancePath: instancePath + "/fieldExtensions/" + i0, schemaPath: "#/properties/fieldExtensions/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/fieldExtensions", schemaPath: "#/properties/fieldExtensions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data2.editableFieldExtension !== void 0) {
      let data7 = data2.editableFieldExtension;
      if (typeof data7 === "string") {
        if (func1(data7) < 1) {
          const err17 = { instancePath: instancePath + "/editableFieldExtension", schemaPath: "#/properties/editableFieldExtension/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err17];
          } else {
            vErrors.push(err17);
          }
          errors++;
        }
      } else {
        const err18 = { instancePath: instancePath + "/editableFieldExtension", schemaPath: "#/properties/editableFieldExtension/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
  } else {
    const err19 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err19];
    } else {
      vErrors.push(err19);
    }
    errors++;
  }
  validate20.errors = vErrors;
  return errors === 0;
}
validate20.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };

// node_modules/@tauri-apps/api/external/tslib/tslib.es6.js
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}

// node_modules/@tauri-apps/api/core.js
var _Channel_onmessage;
var _Channel_nextMessageIndex;
var _Channel_pendingMessages;
var _Channel_messageEndIndex;
var _Resource_rid;
var SERIALIZE_TO_IPC_FN = "__TAURI_TO_IPC_KEY__";
function transformCallback(callback, once = false) {
  return window.__TAURI_INTERNALS__.transformCallback(callback, once);
}
var Channel = class {
  constructor(onmessage) {
    _Channel_onmessage.set(this, void 0);
    _Channel_nextMessageIndex.set(this, 0);
    _Channel_pendingMessages.set(this, []);
    _Channel_messageEndIndex.set(this, void 0);
    __classPrivateFieldSet(this, _Channel_onmessage, onmessage || (() => {
    }), "f");
    this.id = transformCallback((rawMessage) => {
      const index = rawMessage.index;
      if ("end" in rawMessage) {
        if (index == __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")) {
          this.cleanupCallback();
        } else {
          __classPrivateFieldSet(this, _Channel_messageEndIndex, index, "f");
        }
        return;
      }
      const message = rawMessage.message;
      if (index == __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")) {
        __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message);
        __classPrivateFieldSet(this, _Channel_nextMessageIndex, __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") + 1, "f");
        while (__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") in __classPrivateFieldGet(this, _Channel_pendingMessages, "f")) {
          const message2 = __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")];
          __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message2);
          delete __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")];
          __classPrivateFieldSet(this, _Channel_nextMessageIndex, __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") + 1, "f");
        }
        if (__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") === __classPrivateFieldGet(this, _Channel_messageEndIndex, "f")) {
          this.cleanupCallback();
        }
      } else {
        __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[index] = message;
      }
    });
  }
  cleanupCallback() {
    window.__TAURI_INTERNALS__.unregisterCallback(this.id);
  }
  /**
   * The handler called for every message sent by the Rust side of this channel.
   *
   * Assigning a new handler replaces the previous one; messages that arrived
   * before a handler was set are not replayed, so set it (or pass it to the
   * constructor) before sending the channel to the backend.
   */
  set onmessage(handler) {
    __classPrivateFieldSet(this, _Channel_onmessage, handler, "f");
  }
  get onmessage() {
    return __classPrivateFieldGet(this, _Channel_onmessage, "f");
  }
  [(_Channel_onmessage = /* @__PURE__ */ new WeakMap(), _Channel_nextMessageIndex = /* @__PURE__ */ new WeakMap(), _Channel_pendingMessages = /* @__PURE__ */ new WeakMap(), _Channel_messageEndIndex = /* @__PURE__ */ new WeakMap(), SERIALIZE_TO_IPC_FN)]() {
    return `__CHANNEL__:${this.id}`;
  }
  toJSON() {
    return this[SERIALIZE_TO_IPC_FN]();
  }
};
async function invoke(cmd, args = {}, options) {
  return window.__TAURI_INTERNALS__.invoke(cmd, args, options);
}
var Resource = class {
  get rid() {
    return __classPrivateFieldGet(this, _Resource_rid, "f");
  }
  constructor(rid) {
    _Resource_rid.set(this, void 0);
    __classPrivateFieldSet(this, _Resource_rid, rid, "f");
  }
  /**
   * Destroys and cleans up this resource from memory.
   * **You should not call any method on this object anymore and should drop any reference to it.**
   *
   * @remarks Uses the `core:resources:allow-close` permission, which is part of
   * the `core:resources:default` permission set enabled by default.
   */
  async close() {
    return invoke("plugin:resources|close", {
      rid: this.rid
    });
  }
  async [(_Resource_rid = /* @__PURE__ */ new WeakMap(), Symbol.asyncDispose)]() {
    await this.close();
  }
};

// src/model/generated/scheduleValidator.js
var import_ucs2length2 = __toESM(require_ucs2length(), 1);
var import_formats = __toESM(require_formats(), 1);
var import_equal = __toESM(require_equal(), 1);
function __standaloneValue2(mod, path) {
  const read = (root) => path.reduce((current, key) => current?.[key], root);
  if (path.length === 1 && path[0] === "default" && typeof mod === "function") return mod;
  const direct = read(mod);
  return direct === void 0 ? read(mod?.default) : direct;
}
var func12 = __standaloneValue2(import_ucs2length2.default, ["default"]);
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
        if (func12(data1) < 1) {
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
var formats4 = __standaloneValue2(import_formats.default, ["fullFormats", "date"]);
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
        if (func12(data1) < 1) {
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
var schema43 = { "type": "object", "additionalProperties": false, "required": ["id", "name", "start", "end", "assigneeId", "status", "progress", "confidence", "predecessors", "milestoneId"], "properties": { "id": { "$ref": "#/$defs/scheduleId" }, "name": { "type": "string", "minLength": 1 }, "start": { "$ref": "#/$defs/isoDate" }, "end": { "$ref": "#/$defs/isoDate", "description": "\u7D42\u4E86\u65E5\uFF08\u3053\u306E\u65E5\u3092\u542B\u3080\uFF09\u3002\u958B\u59CB\u65E5\u4EE5\u964D\u3002" }, "assigneeId": { "oneOf": [{ "type": "null" }, { "type": "string", "minLength": 1 }, { "type": "array", "minItems": 1, "maxItems": 1, "uniqueItems": true, "items": { "type": "string", "minLength": 1 } }, { "type": "array", "minItems": 2, "uniqueItems": true, "items": { "type": "string", "minLength": 1 } }], "description": "\u672A\u5272\u5F53\u306F null\u3002\u4E00\u4EBA\u306F id \u306E\u6587\u5B57\u5217\u3001\u307E\u305F\u306F\u8981\u7D201\u3064\u306E\u914D\u5217\u3002\u4E8C\u4EBA\u4EE5\u4E0A\u306F\u5165\u308C\u305F\u9806\u306E id \u914D\u5217\u3002" }, "status": { "$ref": "#/$defs/taskStatus" }, "progress": { "type": "integer", "minimum": 0, "maximum": 100 }, "confidence": { "type": "string", "enum": ["tentative", "committed"], "description": "\u65E5\u4ED8\u3092\u5408\u610F\u3057\u305F\u304B\u3069\u3046\u304B\u3002\u7740\u624B\u3084\u9032\u6357\u3068\u306F\u72EC\u7ACB\u3002tentative \u306F\u672A\u78BA\u5B9A\u3001committed \u306F\u78BA\u5B9A\u3002" }, "predecessors": { "type": "array", "items": { "$ref": "#/$defs/scheduleId" }, "uniqueItems": true }, "milestoneId": { "oneOf": [{ "$ref": "#/$defs/scheduleId" }, { "type": "null" }] }, "todos": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/taskTodoItem" }, "description": "\u9032\u6357\u3092\u4EF6\u6570\u3067\u6C7A\u3081\u308B\u4EFB\u610F\u306E\u9805\u76EE\u30021\u4EF6\u4EE5\u4E0A\u3042\u308B\u3068\u304D\u3060\u3051\u66F8\u304F\u3002" }, "tags": { "type": "array", "items": { "type": "string", "minLength": 1 }, "description": "\u8AAC\u660E\u7528\u306E\u4EFB\u610F\u30BF\u30B0\u3002\u753B\u9762\u3067\u306F\u7D5E\u308A\u8FBC\u307F\u306B\u4F7F\u3046\u3002" }, "fieldValues": { "$ref": "#/$defs/taskFieldValues", "description": "\u8FFD\u52A0\u9805\u76EE\u306E\u5024\u3002\u5B9A\u7FA9\u306E key \u3060\u3051\u30021\u4EF6\u4EE5\u4E0A\u3042\u308B\u3068\u304D\u3060\u3051\u66F8\u304F\u3002" }, "note": { "type": "string", "minLength": 1, "description": "\u30BF\u30B9\u30AF\u306E\u88DC\u8DB3\u8AAC\u660E\uFF08\u4EFB\u610F\uFF09\u3002\u753B\u9762\u3067\u306F\u30CE\u30FC\u30C8\u3068\u3057\u3066\u8868\u793A\u3059\u308B\u3002" } } };
var func9 = Object.prototype.hasOwnProperty;
var func0 = __standaloneValue2(import_equal.default, ["default"]);
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
      if (!func9.call(schema43.properties, key0)) {
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
        if (func12(data1) < 1) {
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
        if (func12(data4) < 1) {
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
              if (func12(data5) < 1) {
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
                if (func12(data6) < 1) {
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
        if (func12(data7) < 1) {
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
    if (data2.progress !== void 0) {
      let data8 = data2.progress;
      if (!(typeof data8 == "number" && (!(data8 % 1) && !isNaN(data8)))) {
        const err36 = { instancePath: instancePath + "/progress", schemaPath: "#/properties/progress/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err36];
        } else {
          vErrors.push(err36);
        }
        errors++;
      }
      if (typeof data8 == "number") {
        if (data8 > 100 || isNaN(data8)) {
          const err37 = { instancePath: instancePath + "/progress", schemaPath: "#/properties/progress/maximum", keyword: "maximum", params: { comparison: "<=", limit: 100 }, message: "must be <= 100" };
          if (vErrors === null) {
            vErrors = [err37];
          } else {
            vErrors.push(err37);
          }
          errors++;
        }
        if (data8 < 0 || isNaN(data8)) {
          const err38 = { instancePath: instancePath + "/progress", schemaPath: "#/properties/progress/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
          if (vErrors === null) {
            vErrors = [err38];
          } else {
            vErrors.push(err38);
          }
          errors++;
        }
      }
    }
    if (data2.confidence !== void 0) {
      let data9 = data2.confidence;
      if (typeof data9 !== "string") {
        const err39 = { instancePath: instancePath + "/confidence", schemaPath: "#/properties/confidence/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err39];
        } else {
          vErrors.push(err39);
        }
        errors++;
      }
      if (!(data9 === "tentative" || data9 === "committed")) {
        const err40 = { instancePath: instancePath + "/confidence", schemaPath: "#/properties/confidence/enum", keyword: "enum", params: { allowedValues: schema43.properties.confidence.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err40];
        } else {
          vErrors.push(err40);
        }
        errors++;
      }
    }
    if (data2.predecessors !== void 0) {
      let data10 = data2.predecessors;
      if (Array.isArray(data10)) {
        const len2 = data10.length;
        for (let i4 = 0; i4 < len2; i4++) {
          let data11 = data10[i4];
          if (typeof data11 === "string") {
            if (!formats0.test(data11)) {
              const err41 = { instancePath: instancePath + "/predecessors/" + i4, schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
              if (vErrors === null) {
                vErrors = [err41];
              } else {
                vErrors.push(err41);
              }
              errors++;
            }
          } else {
            const err42 = { instancePath: instancePath + "/predecessors/" + i4, schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err42];
            } else {
              vErrors.push(err42);
            }
            errors++;
          }
        }
        let i5 = data10.length;
        let j2;
        if (i5 > 1) {
          outer0: for (; i5--; ) {
            for (j2 = i5; j2--; ) {
              if (func0(data10[i5], data10[j2])) {
                const err43 = { instancePath: instancePath + "/predecessors", schemaPath: "#/properties/predecessors/uniqueItems", keyword: "uniqueItems", params: { i: i5, j: j2 }, message: "must NOT have duplicate items (items ## " + j2 + " and " + i5 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err43];
                } else {
                  vErrors.push(err43);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err44 = { instancePath: instancePath + "/predecessors", schemaPath: "#/properties/predecessors/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err44];
        } else {
          vErrors.push(err44);
        }
        errors++;
      }
    }
    if (data2.milestoneId !== void 0) {
      let data12 = data2.milestoneId;
      const _errs40 = errors;
      let valid16 = false;
      let passing1 = null;
      const _errs41 = errors;
      if (typeof data12 === "string") {
        if (!formats0.test(data12)) {
          const err45 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/$defs/scheduleId/format", keyword: "format", params: { format: "uuid" }, message: 'must match format "uuid"' };
          if (vErrors === null) {
            vErrors = [err45];
          } else {
            vErrors.push(err45);
          }
          errors++;
        }
      } else {
        const err46 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/$defs/scheduleId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err46];
        } else {
          vErrors.push(err46);
        }
        errors++;
      }
      var _valid1 = _errs41 === errors;
      if (_valid1) {
        valid16 = true;
        passing1 = 0;
      }
      const _errs44 = errors;
      if (data12 !== null) {
        const err47 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/properties/milestoneId/oneOf/1/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err47];
        } else {
          vErrors.push(err47);
        }
        errors++;
      }
      var _valid1 = _errs44 === errors;
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
        const err48 = { instancePath: instancePath + "/milestoneId", schemaPath: "#/properties/milestoneId/oneOf", keyword: "oneOf", params: { passingSchemas: passing1 }, message: "must match exactly one schema in oneOf" };
        if (vErrors === null) {
          vErrors = [err48];
        } else {
          vErrors.push(err48);
        }
        errors++;
      } else {
        errors = _errs40;
        if (vErrors !== null) {
          if (_errs40) {
            vErrors.length = _errs40;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data2.todos !== void 0) {
      let data13 = data2.todos;
      if (Array.isArray(data13)) {
        if (data13.length < 1) {
          const err49 = { instancePath: instancePath + "/todos", schemaPath: "#/properties/todos/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err49];
          } else {
            vErrors.push(err49);
          }
          errors++;
        }
        const len3 = data13.length;
        for (let i6 = 0; i6 < len3; i6++) {
          let data14 = data13[i6];
          if (data14 && typeof data14 == "object" && !Array.isArray(data14)) {
            if (data14.text === void 0) {
              const err50 = { instancePath: instancePath + "/todos/" + i6, schemaPath: "#/$defs/taskTodoItem/required", keyword: "required", params: { missingProperty: "text" }, message: "must have required property 'text'" };
              if (vErrors === null) {
                vErrors = [err50];
              } else {
                vErrors.push(err50);
              }
              errors++;
            }
            if (data14.done === void 0) {
              const err51 = { instancePath: instancePath + "/todos/" + i6, schemaPath: "#/$defs/taskTodoItem/required", keyword: "required", params: { missingProperty: "done" }, message: "must have required property 'done'" };
              if (vErrors === null) {
                vErrors = [err51];
              } else {
                vErrors.push(err51);
              }
              errors++;
            }
            for (const key1 in data14) {
              if (!(key1 === "text" || key1 === "done")) {
                const err52 = { instancePath: instancePath + "/todos/" + i6, schemaPath: "#/$defs/taskTodoItem/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err52];
                } else {
                  vErrors.push(err52);
                }
                errors++;
              }
            }
            if (data14.text !== void 0) {
              let data15 = data14.text;
              if (typeof data15 === "string") {
                if (func12(data15) < 1) {
                  const err53 = { instancePath: instancePath + "/todos/" + i6 + "/text", schemaPath: "#/$defs/taskTodoItem/properties/text/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err53];
                  } else {
                    vErrors.push(err53);
                  }
                  errors++;
                }
              } else {
                const err54 = { instancePath: instancePath + "/todos/" + i6 + "/text", schemaPath: "#/$defs/taskTodoItem/properties/text/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err54];
                } else {
                  vErrors.push(err54);
                }
                errors++;
              }
            }
            if (data14.done !== void 0) {
              if (typeof data14.done !== "boolean") {
                const err55 = { instancePath: instancePath + "/todos/" + i6 + "/done", schemaPath: "#/$defs/taskTodoItem/properties/done/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err55];
                } else {
                  vErrors.push(err55);
                }
                errors++;
              }
            }
          } else {
            const err56 = { instancePath: instancePath + "/todos/" + i6, schemaPath: "#/$defs/taskTodoItem/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err56];
            } else {
              vErrors.push(err56);
            }
            errors++;
          }
        }
      } else {
        const err57 = { instancePath: instancePath + "/todos", schemaPath: "#/properties/todos/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err57];
        } else {
          vErrors.push(err57);
        }
        errors++;
      }
    }
    if (data2.tags !== void 0) {
      let data17 = data2.tags;
      if (Array.isArray(data17)) {
        const len4 = data17.length;
        for (let i7 = 0; i7 < len4; i7++) {
          let data18 = data17[i7];
          if (typeof data18 === "string") {
            if (func12(data18) < 1) {
              const err58 = { instancePath: instancePath + "/tags/" + i7, schemaPath: "#/properties/tags/items/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err58];
              } else {
                vErrors.push(err58);
              }
              errors++;
            }
          } else {
            const err59 = { instancePath: instancePath + "/tags/" + i7, schemaPath: "#/properties/tags/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err59];
            } else {
              vErrors.push(err59);
            }
            errors++;
          }
        }
      } else {
        const err60 = { instancePath: instancePath + "/tags", schemaPath: "#/properties/tags/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err60];
        } else {
          vErrors.push(err60);
        }
        errors++;
      }
    }
    if (data2.fieldValues !== void 0) {
      let data19 = data2.fieldValues;
      if (data19 && typeof data19 == "object" && !Array.isArray(data19)) {
        for (const key2 in data19) {
          let data20 = data19[key2];
          const _errs65 = errors;
          let valid26 = false;
          let passing2 = null;
          const _errs66 = errors;
          if (typeof data20 === "string") {
            if (func12(data20) < 1) {
              const err61 = { instancePath: instancePath + "/fieldValues/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/$defs/taskFieldValues/additionalProperties/oneOf/0/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err61];
              } else {
                vErrors.push(err61);
              }
              errors++;
            }
          } else {
            const err62 = { instancePath: instancePath + "/fieldValues/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/$defs/taskFieldValues/additionalProperties/oneOf/0/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err62];
            } else {
              vErrors.push(err62);
            }
            errors++;
          }
          var _valid2 = _errs66 === errors;
          if (_valid2) {
            valid26 = true;
            passing2 = 0;
          }
          const _errs68 = errors;
          if (!(typeof data20 == "number")) {
            const err63 = { instancePath: instancePath + "/fieldValues/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/$defs/taskFieldValues/additionalProperties/oneOf/1/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err63];
            } else {
              vErrors.push(err63);
            }
            errors++;
          }
          var _valid2 = _errs68 === errors;
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
            const err64 = { instancePath: instancePath + "/fieldValues/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/$defs/taskFieldValues/additionalProperties/oneOf", keyword: "oneOf", params: { passingSchemas: passing2 }, message: "must match exactly one schema in oneOf" };
            if (vErrors === null) {
              vErrors = [err64];
            } else {
              vErrors.push(err64);
            }
            errors++;
          } else {
            errors = _errs65;
            if (vErrors !== null) {
              if (_errs65) {
                vErrors.length = _errs65;
              } else {
                vErrors = null;
              }
            }
          }
        }
      } else {
        const err65 = { instancePath: instancePath + "/fieldValues", schemaPath: "#/$defs/taskFieldValues/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err65];
        } else {
          vErrors.push(err65);
        }
        errors++;
      }
    }
    if (data2.note !== void 0) {
      let data21 = data2.note;
      if (typeof data21 === "string") {
        if (func12(data21) < 1) {
          const err66 = { instancePath: instancePath + "/note", schemaPath: "#/properties/note/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err66];
          } else {
            vErrors.push(err66);
          }
          errors++;
        }
      } else {
        const err67 = { instancePath: instancePath + "/note", schemaPath: "#/properties/note/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err67];
        } else {
          vErrors.push(err67);
        }
        errors++;
      }
    }
  } else {
    const err68 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err68];
    } else {
      vErrors.push(err68);
    }
    errors++;
  }
  validate27.errors = vErrors;
  return errors === 0;
}
validate27.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate26(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate26.evaluated;
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
        if (func12(data1) < 1) {
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
          if (!validate27(data22[i0], { instancePath: instancePath + "/tasks/" + i0, parentData: data22, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
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
  validate26.errors = vErrors;
  return errors === 0;
}
validate26.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
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
        if (func12(data1) < 1) {
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
          if (!validate26(data22[i0], { instancePath: instancePath + "/groups/" + i0, parentData: data22, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
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
  validate25.errors = vErrors;
  return errors === 0;
}
validate25.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var wrapper0 = { validate: validate31 };
function validate32(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate32.evaluated;
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
        if (func12(data1) < 1) {
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
  validate32.errors = vErrors;
  return errors === 0;
}
validate32.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate31(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate31.evaluated;
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
  if (!validate32(data2, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
    errors = vErrors.length;
  }
  var _valid0 = _errs1 === errors;
  if (_valid0) {
    valid0 = true;
    passing0 = 0;
    var props0 = true;
  }
  const _errs2 = errors;
  if (!validate27(data2, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
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
  validate31.errors = vErrors;
  evaluated0.props = props0;
  return errors === 0;
}
validate31.evaluated = { "dynamicProps": true, "dynamicItems": false };
function validate202(data2, { instancePath = "", parentData, parentDataProperty, rootData = data2, dynamicAnchors = {} } = {}) {
  ;
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate202.evaluated;
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
      if (!(key0 === "schemaVersion" || key0 === "title" || key0 === "milestoneGroups" || key0 === "milestones" || key0 === "levels" || key0 === "categories" || key0 === "outline")) {
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
        if (func12(data1) < 1) {
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
    if (data2.levels !== void 0) {
      let data6 = data2.levels;
      if (Array.isArray(data6)) {
        if (data6.length > 5) {
          const err11 = { instancePath: instancePath + "/levels", schemaPath: "#/properties/levels/maxItems", keyword: "maxItems", params: { limit: 5 }, message: "must NOT have more than 5 items" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        if (data6.length < 1) {
          const err12 = { instancePath: instancePath + "/levels", schemaPath: "#/properties/levels/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
        const len2 = data6.length;
        for (let i2 = 0; i2 < len2; i2++) {
          let data7 = data6[i2];
          if (data7 && typeof data7 == "object" && !Array.isArray(data7)) {
            if (data7.name === void 0) {
              const err13 = { instancePath: instancePath + "/levels/" + i2, schemaPath: "#/$defs/levelDefinition/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
              if (vErrors === null) {
                vErrors = [err13];
              } else {
                vErrors.push(err13);
              }
              errors++;
            }
            if (data7.meaning === void 0) {
              const err14 = { instancePath: instancePath + "/levels/" + i2, schemaPath: "#/$defs/levelDefinition/required", keyword: "required", params: { missingProperty: "meaning" }, message: "must have required property 'meaning'" };
              if (vErrors === null) {
                vErrors = [err14];
              } else {
                vErrors.push(err14);
              }
              errors++;
            }
            for (const key1 in data7) {
              if (!(key1 === "name" || key1 === "meaning" || key1 === "instruction")) {
                const err15 = { instancePath: instancePath + "/levels/" + i2, schemaPath: "#/$defs/levelDefinition/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err15];
                } else {
                  vErrors.push(err15);
                }
                errors++;
              }
            }
            if (data7.name !== void 0) {
              let data8 = data7.name;
              if (typeof data8 === "string") {
                if (func12(data8) < 1) {
                  const err16 = { instancePath: instancePath + "/levels/" + i2 + "/name", schemaPath: "#/$defs/levelDefinition/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err16];
                  } else {
                    vErrors.push(err16);
                  }
                  errors++;
                }
              } else {
                const err17 = { instancePath: instancePath + "/levels/" + i2 + "/name", schemaPath: "#/$defs/levelDefinition/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data7.meaning !== void 0) {
              let data9 = data7.meaning;
              if (typeof data9 === "string") {
                if (func12(data9) < 1) {
                  const err18 = { instancePath: instancePath + "/levels/" + i2 + "/meaning", schemaPath: "#/$defs/levelDefinition/properties/meaning/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err18];
                  } else {
                    vErrors.push(err18);
                  }
                  errors++;
                }
              } else {
                const err19 = { instancePath: instancePath + "/levels/" + i2 + "/meaning", schemaPath: "#/$defs/levelDefinition/properties/meaning/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data7.instruction !== void 0) {
              let data10 = data7.instruction;
              if (typeof data10 === "string") {
                if (func12(data10) < 1) {
                  const err20 = { instancePath: instancePath + "/levels/" + i2 + "/instruction", schemaPath: "#/$defs/levelDefinition/properties/instruction/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err20];
                  } else {
                    vErrors.push(err20);
                  }
                  errors++;
                }
              } else {
                const err21 = { instancePath: instancePath + "/levels/" + i2 + "/instruction", schemaPath: "#/$defs/levelDefinition/properties/instruction/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
          } else {
            const err22 = { instancePath: instancePath + "/levels/" + i2, schemaPath: "#/$defs/levelDefinition/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err22];
            } else {
              vErrors.push(err22);
            }
            errors++;
          }
        }
      } else {
        const err23 = { instancePath: instancePath + "/levels", schemaPath: "#/properties/levels/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err23];
        } else {
          vErrors.push(err23);
        }
        errors++;
      }
    }
    if (data2.categories !== void 0) {
      let data11 = data2.categories;
      if (Array.isArray(data11)) {
        const len3 = data11.length;
        for (let i3 = 0; i3 < len3; i3++) {
          if (!validate25(data11[i3], { instancePath: instancePath + "/categories/" + i3, parentData: data11, parentDataProperty: i3, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err24 = { instancePath: instancePath + "/categories", schemaPath: "#/properties/categories/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data2.outline !== void 0) {
      let data13 = data2.outline;
      if (Array.isArray(data13)) {
        if (data13.length < 1) {
          const err25 = { instancePath: instancePath + "/outline", schemaPath: "#/properties/outline/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err25];
          } else {
            vErrors.push(err25);
          }
          errors++;
        }
        const len4 = data13.length;
        for (let i4 = 0; i4 < len4; i4++) {
          if (!validate31(data13[i4], { instancePath: instancePath + "/outline/" + i4, parentData: data13, parentDataProperty: i4, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate31.errors : vErrors.concat(validate31.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err26 = { instancePath: instancePath + "/outline", schemaPath: "#/properties/outline/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err26];
        } else {
          vErrors.push(err26);
        }
        errors++;
      }
    }
  } else {
    const err27 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err27];
    } else {
      vErrors.push(err27);
    }
    errors++;
  }
  validate202.errors = vErrors;
  return errors === 0;
}
validate202.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };

// src/model/hierarchy.ts
var LEGACY_THREE_LEVEL_DEFS = [
  { name: "\u30AB\u30C6\u30B4\u30EA", meaning: "\u6700\u4E0A\u6BB5\u306E\u898B\u51FA\u3057\u3002" },
  { name: "\u30B0\u30EB\u30FC\u30D7", meaning: "\u30BF\u30B9\u30AF\u306E\u4E00\u3064\u4E0A\u306E\u898B\u51FA\u3057\u3002" },
  { name: "\u30BF\u30B9\u30AF", meaning: "\u6700\u4E0B\u6BB5\u3002" }
];
var LEGACY_THREE_LEVEL_COUNT = LEGACY_THREE_LEVEL_DEFS.length;

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

// src/model/scheduleFile.ts
var MAX_SCHEDULE_BYTES = 10 * 1024 * 1024;

// src/model/workspacePath.ts
function isAbsoluteFilesystemPath(path) {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("\\\\")) return true;
  return /^[A-Za-z]:[\\/]/.test(trimmed);
}
function isWorkspaceRelativePath(path) {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (isAbsoluteFilesystemPath(trimmed)) return false;
  if (trimmed.endsWith("/") || trimmed.endsWith("\\")) return false;
  return true;
}

// src/model/validateWorkspace.ts
function schemaIssues(data2) {
  if (workspaceValidator_default(data2)) return [];
  return formatAjvErrors(data2, workspaceValidator_default.errors);
}
function relativePathIssues(value, field) {
  if (!isWorkspaceRelativePath(value)) {
    return {
      path: `/${field}`,
      message: "\u76F8\u5BFE\u30D1\u30B9\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044"
    };
  }
  return null;
}
function validateWorkspace(data2) {
  const schemaErrors = schemaIssues(data2);
  if (schemaErrors.length > 0) {
    return { ok: false, errors: schemaErrors };
  }
  const doc = data2;
  const errors = [];
  const scheduleIssue = relativePathIssues(doc.schedule, "schedule");
  if (scheduleIssue) errors.push(scheduleIssue);
  if (doc.members != null) {
    const membersIssue = relativePathIssues(doc.members, "members");
    if (membersIssue) errors.push(membersIssue);
  }
  if (doc.calendar != null) {
    const calendarIssue = relativePathIssues(doc.calendar, "calendar");
    if (calendarIssue) errors.push(calendarIssue);
  }
  if (doc.statuses != null) {
    const statusesIssue = relativePathIssues(doc.statuses, "statuses");
    if (statusesIssue) errors.push(statusesIssue);
  }
  if (doc.fieldExtensions != null) {
    for (let i = 0; i < doc.fieldExtensions.length; i += 1) {
      const value = doc.fieldExtensions[i];
      const issue = relativePathIssues(value, `fieldExtensions/${i}`);
      if (issue) errors.push(issue);
    }
  }
  if (doc.editableFieldExtension != null) {
    const editableIssue = relativePathIssues(
      doc.editableFieldExtension,
      "editableFieldExtension"
    );
    if (editableIssue) errors.push(editableIssue);
    if (doc.fieldExtensions != null && doc.fieldExtensions.includes(doc.editableFieldExtension)) {
      errors.push({
        path: "/editableFieldExtension",
        message: "\u30D4\u30F3\u7559\u3081\u3057\u305F\u62E1\u5F35\u3068\u540C\u3058\u30D5\u30A1\u30A4\u30EB\u3092\u7DE8\u96C6\u7528\u306B\u6307\u5B9A\u3067\u304D\u307E\u305B\u3093\u3002"
      });
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, document: doc };
}
function formatWorkspaceValidationErrors(errors) {
  if (errors.length === 0) return "\u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002";
  const first = errors[0];
  return first.message;
}

// scripts/validate-workspace-cli.ts
var file = process.argv[2];
if (!file) {
  console.error("Usage: validate-workspace <path-to.json>");
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
var result = validateWorkspace(data);
if (!result.ok) {
  console.error(formatWorkspaceValidationErrors(result.errors));
  process.exit(1);
}
console.log("OK");
