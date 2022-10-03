import { assemble } from "./assembler/index.js";
import { CPU } from "./cpu.js";
import { MemoryMapper } from "./memory-mapper.js";
import { createMemory } from "./memory.js";
import fs from "fs";
import { createScreenDevice } from "./screen-device.js";

const MM = new MemoryMapper();

const cpu = new CPU(MM);

const regularMemory = createMemory(256 * 256);
MM.map(regularMemory, 0, 0xffff, true);
const screen = createScreenDevice();
MM.map(screen, 0x3000, 0x31ff, true);

var args = process.argv.slice(2);
if (args.length >= 1) {
  try {
    const program = fs.readFileSync(args[0], null);
    MM.load(0x0000, program);
    console.log(program);
  } catch (err) {
    console.error(err);
    process.exit();
  }
} else {
  const program = assemble(
    `
  
  mov $1234, r1
  mov $abcd, r2
  add r1, r2
  mov acc, r3
  hlt
  
  `
  );

  MM.load(0x0000, program);
}

cpu.run();
