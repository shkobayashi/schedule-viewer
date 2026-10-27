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

// scripts/validate-field-extensions-cli.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// src/model/fieldExtensionMerge.ts
var PLUGIN_OR_ITEM_ID_PATTERN = /^[^\s_]+$/;
function isValidPluginOrItemId(id) {
  return id.length > 0 && PLUGIN_OR_ITEM_ID_PATTERN.test(id);
}
function compositeFieldKey(pluginId, itemId) {
  return `${pluginId}_${itemId}`;
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

// src/model/generated/fieldExtensionsValidator.js
var import_ucs2length = __toESM(require_ucs2length(), 1);
function __standaloneValue(mod, path) {
  const read = (root) => path.reduce((current, key) => current?.[key], root);
  if (path.length === 1 && path[0] === "default" && typeof mod === "function") return mod;
  const direct = read(mod);
  return direct === void 0 ? read(mod?.default) : direct;
}
var fieldExtensionsValidator_default = validate20;
var schema32 = { "type": "object", "additionalProperties": false, "required": ["id", "name", "type"], "properties": { "id": { "type": "string", "minLength": 1 }, "name": { "type": "string", "minLength": 1 }, "type": { "type": "string", "enum": ["text", "number", "date", "choice"] }, "meaning": { "type": "string", "minLength": 1 }, "instruction": { "type": "string", "minLength": 1 }, "required": { "const": true }, "default": {}, "percent": { "const": true }, "choices": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } } }, "allOf": [{ "if": { "properties": { "type": { "const": "choice" } }, "required": ["type"] }, "then": { "required": ["choices"] } }] };
var func1 = __standaloneValue(import_ucs2length.default, ["default"]);
var func3 = Object.prototype.hasOwnProperty;
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
    if (data2.id === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data2.name === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data2.fields === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "fields" }, message: "must have required property 'fields'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data2) {
      if (!(key0 === "schemaVersion" || key0 === "id" || key0 === "name" || key0 === "fields")) {
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
    if (data2.id !== void 0) {
      let data1 = data2.id;
      if (typeof data1 === "string") {
        if (func1(data1) < 1) {
          const err7 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
      } else {
        const err8 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data2.name !== void 0) {
      let data22 = data2.name;
      if (typeof data22 === "string") {
        if (func1(data22) < 1) {
          const err9 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
      } else {
        const err10 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data2.fields !== void 0) {
      let data3 = data2.fields;
      if (Array.isArray(data3)) {
        if (data3.length < 1) {
          const err11 = { instancePath: instancePath + "/fields", schemaPath: "#/properties/fields/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        const len0 = data3.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data4 = data3[i0];
          const _errs14 = errors;
          let valid5 = true;
          const _errs15 = errors;
          if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
            let missing0;
            if (data4.type === void 0 && (missing0 = "type")) {
              const err12 = {};
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            } else {
              if (data4.type !== void 0) {
                if ("choice" !== data4.type) {
                  const err13 = {};
                  if (vErrors === null) {
                    vErrors = [err13];
                  } else {
                    vErrors.push(err13);
                  }
                  errors++;
                }
              }
            }
          }
          var _valid0 = _errs15 === errors;
          errors = _errs14;
          if (vErrors !== null) {
            if (_errs14) {
              vErrors.length = _errs14;
            } else {
              vErrors = null;
            }
          }
          if (_valid0) {
            const _errs17 = errors;
            if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
              if (data4.choices === void 0) {
                const err14 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/$defs/extensionFieldDefinition/allOf/0/then/required", keyword: "required", params: { missingProperty: "choices" }, message: "must have required property 'choices'" };
                if (vErrors === null) {
                  vErrors = [err14];
                } else {
                  vErrors.push(err14);
                }
                errors++;
              }
            }
            var _valid0 = _errs17 === errors;
            valid5 = _valid0;
          }
          if (!valid5) {
            const err15 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/$defs/extensionFieldDefinition/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
          if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
            if (data4.id === void 0) {
              const err16 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/$defs/extensionFieldDefinition/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            if (data4.name === void 0) {
              const err17 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/$defs/extensionFieldDefinition/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
              if (vErrors === null) {
                vErrors = [err17];
              } else {
                vErrors.push(err17);
              }
              errors++;
            }
            if (data4.type === void 0) {
              const err18 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/$defs/extensionFieldDefinition/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
              if (vErrors === null) {
                vErrors = [err18];
              } else {
                vErrors.push(err18);
              }
              errors++;
            }
            for (const key1 in data4) {
              if (!func3.call(schema32.properties, key1)) {
                const err19 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/$defs/extensionFieldDefinition/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data4.id !== void 0) {
              let data6 = data4.id;
              if (typeof data6 === "string") {
                if (func1(data6) < 1) {
                  const err20 = { instancePath: instancePath + "/fields/" + i0 + "/id", schemaPath: "#/$defs/extensionFieldDefinition/properties/id/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err20];
                  } else {
                    vErrors.push(err20);
                  }
                  errors++;
                }
              } else {
                const err21 = { instancePath: instancePath + "/fields/" + i0 + "/id", schemaPath: "#/$defs/extensionFieldDefinition/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
            if (data4.name !== void 0) {
              let data7 = data4.name;
              if (typeof data7 === "string") {
                if (func1(data7) < 1) {
                  const err22 = { instancePath: instancePath + "/fields/" + i0 + "/name", schemaPath: "#/$defs/extensionFieldDefinition/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err22];
                  } else {
                    vErrors.push(err22);
                  }
                  errors++;
                }
              } else {
                const err23 = { instancePath: instancePath + "/fields/" + i0 + "/name", schemaPath: "#/$defs/extensionFieldDefinition/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
              }
            }
            if (data4.type !== void 0) {
              let data8 = data4.type;
              if (typeof data8 !== "string") {
                const err24 = { instancePath: instancePath + "/fields/" + i0 + "/type", schemaPath: "#/$defs/extensionFieldDefinition/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err24];
                } else {
                  vErrors.push(err24);
                }
                errors++;
              }
              if (!(data8 === "text" || data8 === "number" || data8 === "date" || data8 === "choice")) {
                const err25 = { instancePath: instancePath + "/fields/" + i0 + "/type", schemaPath: "#/$defs/extensionFieldDefinition/properties/type/enum", keyword: "enum", params: { allowedValues: schema32.properties.type.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err25];
                } else {
                  vErrors.push(err25);
                }
                errors++;
              }
            }
            if (data4.meaning !== void 0) {
              let data9 = data4.meaning;
              if (typeof data9 === "string") {
                if (func1(data9) < 1) {
                  const err26 = { instancePath: instancePath + "/fields/" + i0 + "/meaning", schemaPath: "#/$defs/extensionFieldDefinition/properties/meaning/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err26];
                  } else {
                    vErrors.push(err26);
                  }
                  errors++;
                }
              } else {
                const err27 = { instancePath: instancePath + "/fields/" + i0 + "/meaning", schemaPath: "#/$defs/extensionFieldDefinition/properties/meaning/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
            if (data4.instruction !== void 0) {
              let data10 = data4.instruction;
              if (typeof data10 === "string") {
                if (func1(data10) < 1) {
                  const err28 = { instancePath: instancePath + "/fields/" + i0 + "/instruction", schemaPath: "#/$defs/extensionFieldDefinition/properties/instruction/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err28];
                  } else {
                    vErrors.push(err28);
                  }
                  errors++;
                }
              } else {
                const err29 = { instancePath: instancePath + "/fields/" + i0 + "/instruction", schemaPath: "#/$defs/extensionFieldDefinition/properties/instruction/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err29];
                } else {
                  vErrors.push(err29);
                }
                errors++;
              }
            }
            if (data4.required !== void 0) {
              if (true !== data4.required) {
                const err30 = { instancePath: instancePath + "/fields/" + i0 + "/required", schemaPath: "#/$defs/extensionFieldDefinition/properties/required/const", keyword: "const", params: { allowedValue: true }, message: "must be equal to constant" };
                if (vErrors === null) {
                  vErrors = [err30];
                } else {
                  vErrors.push(err30);
                }
                errors++;
              }
            }
            if (data4.percent !== void 0) {
              if (true !== data4.percent) {
                const err31 = { instancePath: instancePath + "/fields/" + i0 + "/percent", schemaPath: "#/$defs/extensionFieldDefinition/properties/percent/const", keyword: "const", params: { allowedValue: true }, message: "must be equal to constant" };
                if (vErrors === null) {
                  vErrors = [err31];
                } else {
                  vErrors.push(err31);
                }
                errors++;
              }
            }
            if (data4.choices !== void 0) {
              let data13 = data4.choices;
              if (Array.isArray(data13)) {
                if (data13.length < 1) {
                  const err32 = { instancePath: instancePath + "/fields/" + i0 + "/choices", schemaPath: "#/$defs/extensionFieldDefinition/properties/choices/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
                  if (vErrors === null) {
                    vErrors = [err32];
                  } else {
                    vErrors.push(err32);
                  }
                  errors++;
                }
                const len1 = data13.length;
                for (let i1 = 0; i1 < len1; i1++) {
                  let data14 = data13[i1];
                  if (typeof data14 === "string") {
                    if (func1(data14) < 1) {
                      const err33 = { instancePath: instancePath + "/fields/" + i0 + "/choices/" + i1, schemaPath: "#/$defs/extensionFieldDefinition/properties/choices/items/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                      if (vErrors === null) {
                        vErrors = [err33];
                      } else {
                        vErrors.push(err33);
                      }
                      errors++;
                    }
                  } else {
                    const err34 = { instancePath: instancePath + "/fields/" + i0 + "/choices/" + i1, schemaPath: "#/$defs/extensionFieldDefinition/properties/choices/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err34];
                    } else {
                      vErrors.push(err34);
                    }
                    errors++;
                  }
                }
              } else {
                const err35 = { instancePath: instancePath + "/fields/" + i0 + "/choices", schemaPath: "#/$defs/extensionFieldDefinition/properties/choices/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err35];
                } else {
                  vErrors.push(err35);
                }
                errors++;
              }
            }
          } else {
            const err36 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/$defs/extensionFieldDefinition/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err36];
            } else {
              vErrors.push(err36);
            }
            errors++;
          }
        }
      } else {
        const err37 = { instancePath: instancePath + "/fields", schemaPath: "#/properties/fields/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err37];
        } else {
          vErrors.push(err37);
        }
        errors++;
      }
    }
  } else {
    const err38 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err38];
    } else {
      vErrors.push(err38);
    }
    errors++;
  }
  validate20.errors = vErrors;
  return errors === 0;
}
validate20.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };

// src/model/validateFieldExtensions.ts
function schemaIssues(data2) {
  if (fieldExtensionsValidator_default(data2)) return [];
  return formatAjvErrors(data2, fieldExtensionsValidator_default.errors);
}
function hasNewline(value) {
  return /[\r\n]/.test(value);
}
function validateFieldExtensionsSemantics(doc) {
  const issues = [];
  const base = "";
  if (!isValidPluginOrItemId(doc.id)) {
    issues.push({
      path: `${base}/id`,
      message: "\u30D7\u30E9\u30B0\u30A4\u30F3 ID \u306B\u7A7A\u767D\u3068 _ \u306F\u4F7F\u3048\u307E\u305B\u3093"
    });
  } else if (doc.id.trim() !== doc.id) {
    issues.push({
      path: `${base}/id`,
      message: "\u30D7\u30E9\u30B0\u30A4\u30F3 ID \u306E\u524D\u5F8C\u306B\u7A7A\u767D\u306F\u66F8\u3051\u307E\u305B\u3093"
    });
  }
  if (doc.name.trim().length === 0) {
    issues.push({ path: `${base}/name`, message: "\u540D\u524D\u306F\u7A7A\u767D\u306B\u3067\u304D\u307E\u305B\u3093" });
  }
  const itemIds = /* @__PURE__ */ new Set();
  const compositeKeys = /* @__PURE__ */ new Set();
  for (let fi = 0; fi < doc.fields.length; fi += 1) {
    const field = doc.fields[fi];
    const fieldBase = `/fields/${fi}`;
    if (field.name.trim().length === 0) {
      issues.push({
        path: `${fieldBase}/name`,
        message: "\u540D\u524D\u306F\u7A7A\u767D\u306B\u3067\u304D\u307E\u305B\u3093"
      });
    }
    if (!isValidPluginOrItemId(field.id)) {
      issues.push({
        path: `${fieldBase}/id`,
        message: "\u9805\u76EE ID \u306B\u7A7A\u767D\u3068 _ \u306F\u4F7F\u3048\u307E\u305B\u3093"
      });
    } else if (field.id.trim() !== field.id) {
      issues.push({
        path: `${fieldBase}/id`,
        message: "\u9805\u76EE ID \u306E\u524D\u5F8C\u306B\u7A7A\u767D\u306F\u66F8\u3051\u307E\u305B\u3093"
      });
    }
    if (itemIds.has(field.id)) {
      issues.push({
        path: `${fieldBase}/id`,
        message: "\u9805\u76EE ID \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
      });
    }
    itemIds.add(field.id);
    const composite = compositeFieldKey(doc.id, field.id);
    if (compositeKeys.has(composite)) {
      issues.push({
        path: `${fieldBase}/id`,
        message: "\u5408\u6210\u30AD\u30FC\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059"
      });
    }
    compositeKeys.add(composite);
    if (field.percent === true && field.type !== "number") {
      issues.push({
        path: `${fieldBase}/percent`,
        message: "\u30D1\u30FC\u30BB\u30F3\u30C8\u8868\u793A\u306F\u6570\u5024\u578B\u3060\u3051\u306B\u4ED8\u3051\u3089\u308C\u307E\u3059"
      });
    }
    if (field.type === "choice") {
      if (field.choices == null || field.choices.length === 0) {
        issues.push({
          path: `${fieldBase}/choices`,
          message: "\u5019\u88DC\u578B\u306B\u306F choices \u304C\u5FC5\u8981\u3067\u3059"
        });
      } else {
        const choiceSeen = /* @__PURE__ */ new Set();
        for (let ci = 0; ci < field.choices.length; ci += 1) {
          const choice = field.choices[ci];
          const choicePath = `${fieldBase}/choices/${ci}`;
          if (choice.length === 0) {
            issues.push({ path: choicePath, message: "\u5019\u88DC\u306F\u7A7A\u767D\u306B\u3067\u304D\u307E\u305B\u3093" });
          } else if (choice.trim() !== choice) {
            issues.push({
              path: choicePath,
              message: "\u5019\u88DC\u306E\u524D\u5F8C\u306B\u7A7A\u767D\u306F\u66F8\u3051\u307E\u305B\u3093"
            });
          }
          if (choiceSeen.has(choice)) {
            issues.push({ path: choicePath, message: "\u5019\u88DC\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059" });
          }
          choiceSeen.add(choice);
        }
      }
      if (field.default !== void 0 && typeof field.default === "string" && field.choices != null && !field.choices.includes(field.default)) {
        issues.push({
          path: `${fieldBase}/default`,
          message: "\u30C7\u30D5\u30A9\u30EB\u30C8\u306F\u5019\u88DC\u306E\u3044\u305A\u308C\u304B\u306B\u3057\u3066\u304F\u3060\u3055\u3044"
        });
      }
    } else if (field.choices != null) {
      issues.push({
        path: `${fieldBase}/choices`,
        message: "\u5019\u88DC\u306F\u5019\u88DC\u578B\u3060\u3051\u306B\u66F8\u3051\u307E\u3059"
      });
    }
    if (field.default !== void 0) {
      const def = field.default;
      switch (field.type) {
        case "text":
          if (typeof def !== "string" || def.trim().length === 0 || hasNewline(def)) {
            issues.push({
              path: `${fieldBase}/default`,
              message: "\u30C7\u30D5\u30A9\u30EB\u30C8\u306E\u578B\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093"
            });
          }
          break;
        case "number":
          if (typeof def !== "number" || !Number.isFinite(def)) {
            issues.push({
              path: `${fieldBase}/default`,
              message: "\u30C7\u30D5\u30A9\u30EB\u30C8\u306E\u578B\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093"
            });
          }
          break;
        case "date":
          if (typeof def !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(def)) {
            issues.push({
              path: `${fieldBase}/default`,
              message: "\u30C7\u30D5\u30A9\u30EB\u30C8\u306E\u578B\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093"
            });
          }
          break;
        default:
          break;
      }
    }
    if (field.required != null && field.required !== true) {
      issues.push({
        path: `${fieldBase}/required`,
        message: "required \u306F true \u306E\u3068\u304D\u3060\u3051\u66F8\u3051\u307E\u3059"
      });
    }
  }
  return issues;
}
function validateFieldExtensions(data2) {
  const schemaErrors = schemaIssues(data2);
  if (schemaErrors.length > 0) {
    return { ok: false, errors: schemaErrors };
  }
  const doc = data2;
  const semantic = validateFieldExtensionsSemantics(doc);
  if (semantic.length > 0) {
    return { ok: false, errors: semantic };
  }
  return { ok: true, document: doc };
}
function formatFieldExtensionsValidationErrors(errors) {
  if (errors.length === 0) {
    return "\u62E1\u5F35\u9805\u76EE JSON \u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002";
  }
  return errors[0].message;
}

// scripts/validate-field-extensions-cli.ts
var file = process.argv[2];
if (!file) {
  console.error("Usage: validate-field-extensions <path-to.json>");
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
var result = validateFieldExtensions(data);
if (!result.ok) {
  console.error(formatFieldExtensionsValidationErrors(result.errors));
  process.exit(1);
}
console.log("OK");
