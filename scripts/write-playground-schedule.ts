import { writeFileSync } from "node:fs";
import { playgroundScheduleDocument } from "../src/sample/playgroundSchedule";

const path = "examples/playground.schedule.json";
const json = `${JSON.stringify(playgroundScheduleDocument(), null, 2)}\n`;
writeFileSync(path, json, "utf8");
console.log(`Wrote ${path}`);
