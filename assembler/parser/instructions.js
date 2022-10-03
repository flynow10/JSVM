import * as A from "arcsecond";
import { formats as F } from "./formats.js";
import { meta, instructionTypes } from "../../instructions/meta.js";

const typeFormats = Object.entries(instructionTypes).reduce(
  (table, [type, value]) => {
    table[value] = F[type];
    return table;
  },
  {}
);

const allInstructions = meta.map((instruction) => {
  if (!(instruction.type in typeFormats)) {
    throw new Error("Unknown instruction format: ", instruction.type);
  }

  return typeFormats[instruction.type](
    instruction.mnemonic,
    instruction.instruction
  );
});

export const instructionsParser = A.choice(allInstructions);
