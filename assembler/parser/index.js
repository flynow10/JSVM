import { instructionsParser } from "./instructions.js";
import { label } from "./common.js";
import { data8, data16 } from "./data.js";
import { constantParser } from "./constant.js";
import { structureParser } from "./structure.js";
import * as A from "arcsecond";

export const parser = A.many(
  A.choice([
    data8,
    data16,
    structureParser,
    constantParser,
    instructionsParser,
    label,
  ])
).chain((res) => A.endOfInput.map(() => res));
