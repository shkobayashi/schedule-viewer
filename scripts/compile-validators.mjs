import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import standaloneCode from "ajv/dist/standalone/index.js";
import scheduleSchema from "../docs/schedule.schema.json" with { type: "json" };
import membersSchema from "../docs/members.schema.json" with { type: "json" };

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/model/generated",
);

function toEsm(code) {
  const imports = [];
  let index = 0;
  const body = code.replace(
    /const (\w+) = require\("([^"]+)"\)((?:\.\w+)+);/g,
    (_match, name, spec, access) => {
      const local = `__standaloneImport${index}`;
      index += 1;
      const path = access
        .split(".")
        .filter(Boolean)
        .map((key) => JSON.stringify(key))
        .join(", ");
      imports.push(`import ${local} from "${spec}.js";`);
      return `const ${name} = __standaloneValue(${local}, [${path}]);`;
    },
  );
  if (body.includes("require(")) {
    throw new Error("standalone validator still contains require()");
  }
  const helper = `function __standaloneValue(mod, path) {
  const read = (root) => path.reduce((current, key) => current?.[key], root);
  if (path.length === 1 && path[0] === "default" && typeof mod === "function") return mod;
  const direct = read(mod);
  return direct === undefined ? read(mod?.default) : direct;
}`;
  return `${imports.join("\n")}\n${helper}\n${body.replace(/^"use strict";/, "")}`;
}

function compile(schema) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    code: { source: true, esm: true },
  });
  addFormats(ajv);
  return toEsm(standaloneCode(ajv, ajv.compile(schema)));
}

mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "scheduleValidator.js"),
  compile(scheduleSchema),
);
writeFileSync(join(outDir, "membersValidator.js"), compile(membersSchema));
console.log("Compiled standalone validators");
