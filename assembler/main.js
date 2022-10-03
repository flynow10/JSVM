import { assemble } from "./index.js";
import fs from "fs";
var args = process.argv.slice(2);
if (args.length >= 1) {
  try {
    const program = fs.readFileSync(args[0], "utf8");
    try {
      const machineCode = assemble(program, true);
      if (args.length >= 2) {
        try {
          fs.writeFileSync(args[1], new Uint8Array(machineCode));
        } catch (err) {
          console.error("Failed to write to file: ", err);
        }
      }
    } catch (err) {
      console.error("Failed to parse assembly code: ", err);
    }
  } catch (err) {
    console.error("Failed to open input file: ", err);
  }
} else {
  console.log("Pass an assembly file to parse it");
}
