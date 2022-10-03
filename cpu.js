import { instructions } from "./instructions/index.js";
import { MemoryMapper } from "./memory-mapper.js";
import { createMemory } from "./memory.js";
import { registers } from "./registers.js";
export class CPU {
  /**
   * @param {MemoryMapper} memory
   */
  constructor(memory, interruptVectorAddress = 0x1000) {
    this.memory = memory;

    this.registers = createMemory(registers.length * 2);

    this.registerMap = registers.reduce((map, name, i) => {
      map[name] = i * 2;
      return map;
    }, {});

    this.interruptVectorAddress = interruptVectorAddress;
    this.isInInterruptHandler = false;
    this.setRegister("im", 0xffff);

    this.setRegister("sp", 0xffff - 1);
    this.setRegister("fp", 0xffff - 1);

    this.stackFrameSize = 0;
  }

  debug() {
    registers.forEach((name) => {
      console.log(
        `${name}: 0x${this.getRegister(name).toString(16).padStart(4, "0")}`
      );
    });
    console.log();
  }

  viewMemoryAt(address, n = 8) {
    // 0x0f01: 0x04 0x05 0xA3 0xFE 0x13 0x0D 0x44 0x0F ...
    const nextNBytes = Array.from({ length: n }, (_, i) =>
      this.memory.getUint8(address + i)
    ).map((v) => `0x${v.toString(16).padStart(2, "0")}`);

    console.log(
      `0x${address.toString(16).padStart(4, "0")}: ${nextNBytes.join(" ")}`
    );
  }

  getRegister(name) {
    if (!(name in this.registerMap)) {
      throw new Error(`getRegister: No such register ${name}`);
    }
    return this.registers.getUint16(this.registerMap[name]);
  }

  setRegister(name, value) {
    if (!(name in this.registerMap)) {
      throw new Error(`setRegister: No such register ${name}`);
    }
    return this.registers.setUint16(this.registerMap[name], value);
  }

  fetch() {
    const nextInstructionAddress = this.getRegister("ip");
    const instruction = this.memory.getUint8(nextInstructionAddress);
    this.setRegister("ip", nextInstructionAddress + 1);
    return instruction;
  }

  fetch16() {
    const nextInstructionAddress = this.getRegister("ip");
    const instruction = this.memory.getUint16(nextInstructionAddress);
    this.setRegister("ip", nextInstructionAddress + 2);
    return instruction;
  }

  fetchRegisterIndex() {
    return (this.fetch() % registers.length) * 2;
  }

  push(value) {
    const spAddress = this.getRegister("sp");
    this.memory.setUint16(spAddress, value);
    this.setRegister("sp", spAddress - 2);
    this.stackFrameSize += 2;
  }

  pushState() {
    this.push(this.getRegister("r1"));
    this.push(this.getRegister("r2"));
    this.push(this.getRegister("r3"));
    this.push(this.getRegister("r4"));
    this.push(this.getRegister("r5"));
    this.push(this.getRegister("r6"));
    this.push(this.getRegister("r7"));
    this.push(this.getRegister("r8"));
    this.push(this.getRegister("ip"));
    this.push(this.stackFrameSize + 2);

    this.setRegister("fp", this.getRegister("sp"));
    this.stackFrameSize = 0;
  }

  pop() {
    const nextSpAddress = this.getRegister("sp") + 2;
    this.setRegister("sp", nextSpAddress);
    this.stackFrameSize -= 2;
    return this.memory.getUint16(nextSpAddress);
  }

  popState() {
    const framePointerAddress = this.getRegister("fp");
    this.setRegister("sp", framePointerAddress);

    this.stackFrameSize = this.pop();
    const stackFrameSize = this.stackFrameSize;

    this.setRegister("ip", this.pop());
    this.setRegister("r8", this.pop());
    this.setRegister("r7", this.pop());
    this.setRegister("r6", this.pop());
    this.setRegister("r5", this.pop());
    this.setRegister("r4", this.pop());
    this.setRegister("r3", this.pop());
    this.setRegister("r2", this.pop());
    this.setRegister("r1", this.pop());

    const nArgs = this.pop();
    for (let i = 0; i < nArgs; i++) {
      this.pop();
    }

    this.setRegister("fp", framePointerAddress + stackFrameSize);
  }

  handleInterrupt(value) {
    const interruptVectorIndex = value & 0xf;

    const isUnmasked = Boolean(
      (1 << interruptVectorIndex) & this.getRegister("im")
    );
    if (!isUnmasked) {
      return;
    }

    const addressPointer =
      this.interruptVectorAddress + interruptVectorIndex * 2;
    const address = this.memory.getUint16(addressPointer);

    if (!this.isInInterruptHandler) {
      this.push(0);
      this.pushState();
    }

    this.isInInterruptHandler = true;
    this.setRegister("ip", address);
  }

  execute(instruction) {
    switch (instruction) {
      case instructions.RET_INT.opcode: {
        this.isInInterruptHandler = false;
        this.popState();
        return;
      }

      case instructions.INT.opcode: {
        const interruptValue = this.fetch16();
        this.handleInterupt(interruptValue);
        return;
      }

      case instructions.MOV_LIT_REG.opcode: {
        const literal = this.fetch16();
        const register = this.fetchRegisterIndex();
        this.registers.setUint16(register, literal);
        return;
      }

      case instructions.MOV_REG_REG.opcode: {
        const registerFrom = this.fetchRegisterIndex();
        const registerTo = this.fetchRegisterIndex();
        const value = this.registers.getUint16(registerFrom);
        this.registers.setUint16(registerTo, value);
        return;
      }

      case instructions.MOV_REG_MEM.opcode: {
        const registerFrom = this.fetchRegisterIndex();
        const address = this.fetch16();
        const value = this.registers.getUint16(registerFrom);
        this.memory.setUint16(address, value);
        return;
      }

      case instructions.MOV_MEM_REG.opcode: {
        const address = this.fetch16();
        const registerTo = this.fetchRegisterIndex();
        const value = this.memory.getUint16(address);
        this.registers.setUint16(registerTo, value);
        return;
      }

      case instructions.MOV_LIT_MEM.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();
        this.memory.setUint16(address, value);
        return;
      }

      case instructions.MOV_REG_PTR_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const ptr = this.registers.getUint16(r1);
        const value = this.memory.getUint16(ptr);
        this.registers.setUint16(r2, value);
        return;
      }

      case instructions.MOV_LIT_OFF_REG.opcode: {
        const baseAddress = this.fetch16();
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const offset = this.registers.getUint16(r1);
        const value = this.memory.getUint16(baseAddress + offset);
        this.registers.setUint16(r2, value);
        return;
      }

      case instructions.MOV_LIT_MEM_REG_PTR.opcode: {
        const value = this.fetch16();
        const register = this.fetchRegisterIndex();
        const address = this.registers.getUint16(register);
        this.memory.setUint16(address, value);
        return;
      }

      case instructions.ADD_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        this.setRegister("acc", registerValue1 + registerValue2);
        return;
      }

      case instructions.ADD_LIT_REG.opcode: {
        const value = this.fetch16();
        const register = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(register);
        this.setRegister("acc", value + registerValue);
        return;
      }

      case instructions.SUB_LIT_REG.opcode: {
        const value = this.fetch16();
        const register = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(register);
        const res = registerValue - value;
        this.setRegister("acc", res);
        return;
      }

      case instructions.SUB_REG_LIT.opcode: {
        const register = this.fetchRegisterIndex();
        const value = this.fetch16();
        const registerValue = this.registers.getUint16(register);
        const res = value - registerValue;
        this.setRegister("acc", res);
        return;
      }

      case instructions.SUB_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        const res = registerValue1 - registerValue2;
        this.setRegister("acc", res);
        return;
      }

      case instructions.MUL_LIT_REG.opcode: {
        const literal = this.fetch16();
        const r1 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);
        const res = literal * registerValue;
        this.setRegister("acc", res);
        return;
      }

      case instructions.MUL_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        const res = registerValue1 * registerValue2;
        this.setRegister("acc", res);
        return;
      }

      case instructions.INC_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const oldValue = this.registers.getUint16(r1);
        const newValue = oldValue + 1;
        this.registers.setUint16(r1, newValue);
        return;
      }

      case instructions.DEC_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const oldValue = this.registers.getUint16(r1);
        const newValue = oldValue - 1;
        this.registers.setUint16(r1, newValue);
        return;
      }

      case instructions.LSF_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch();
        const oldValue = this.registers.getUint16(r1);
        const res = oldValue << literal;
        this.registers.setUint16(r1, res);
        return;
      }

      case instructions.LSF_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const oldValue = this.registers.getUint16(r1);
        const shiftBy = this.registers.getUint16(r2);
        const res = oldValue << shiftBy;
        this.registers.setUint16(r1, res);
        return;
      }

      case instructions.RSF_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch();
        const oldValue = this.registers.getUint16(r1);
        const res = oldValue >> literal;
        this.registers.setUint16(r1, res);
        return;
      }

      case instructions.RSF_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const oldValue = this.registers.getUint16(r1);
        const shiftBy = this.registers.getUint16(r2);
        const res = oldValue >> shiftBy;
        this.registers.setUint16(r1, res);
        return;
      }

      case instructions.AND_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch16();
        const registerValue = this.registers.getUint16(r1);

        const res = registerValue & literal;
        this.setRegister("acc", res);
        return;
      }

      case instructions.AND_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);

        const res = registerValue1 & registerValue2;
        this.setRegister("acc", res);
        return;
      }

      case instructions.OR_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch16();
        const registerValue = this.registers.getUint16(r1);

        const res = registerValue | literal;
        this.setRegister("acc", res);
        return;
      }

      case instructions.OR_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);

        const res = registerValue1 | registerValue2;
        this.setRegister("acc", res);
        return;
      }

      case instructions.XOR_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch16();
        const registerValue = this.registers.getUint16(r1);

        const res = registerValue ^ literal;
        this.setRegister("acc", res);
        return;
      }

      case instructions.XOR_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);

        const res = registerValue1 ^ registerValue2;
        this.setRegister("acc", res);
        return;
      }

      case instructions.NOT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);

        const res = ~registerValue & 0xffff;
        this.setRegister("acc", res);
        return;
      }

      case instructions.JMP_NOT_EQ.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value !== this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JNE_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value !== this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JEQ_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value === this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JEQ_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value === this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JLT_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value < this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JLT_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value < this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JGT_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value > this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JGT_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value > this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JLE_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value <= this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JLE_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value <= this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JGE_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value >= this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JGE_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value >= this.getRegister("acc")) {
          this.setRegister("ip", address);
        }

        return;
      }

      case instructions.JMP.opcode: {
        const address = this.fetch16();
        this.setRegister("ip", address);
        return;
      }

      case instructions.PSH_LIT.opcode: {
        const value = this.fetch16();
        this.push(value);
        return;
      }

      case instructions.PSH_REG.opcode: {
        const registerIndex = this.fetchRegisterIndex();
        this.push(this.registers.getUint16(registerIndex));
        return;
      }

      case instructions.POP.opcode: {
        const registerIndex = this.fetchRegisterIndex();
        const value = this.pop();
        this.registers.setUint16(registerIndex, value);
        return;
      }

      case instructions.CAL_LIT.opcode: {
        const address = this.fetch16();
        this.pushState();
        this.setRegister("ip", address);
        return;
      }

      case instructions.CAL_REG.opcode: {
        const registerIndex = this.fetchRegisterIndex();
        const address = this.registers.getUint16(registerIndex);
        this.pushState();
        this.setRegister("ip", address);
        return;
      }

      case instructions.SLP_LIT.opcode: {
        const milliseconds = this.fetch16();
        return milliseconds;
      }

      case instructions.RET.opcode: {
        this.popState();
        return;
      }

      case instructions.HLT.opcode: {
        return true;
      }
    }
  }

  step() {
    const instruction = this.fetch();
    return this.execute(instruction);
  }

  run(debug = false, afterRun = null) {
    if (debug) {
      this.debug();
    }
    const retVal = this.step();
    if (typeof retVal === "number") {
      setTimeout(() => this.run(debug, afterRun), retVal);
    } else {
      if (!retVal) {
        setImmediate(() => this.run(debug, afterRun));
      } else {
        if (afterRun !== null) {
          afterRun();
        }
      }
    }
  }
}
