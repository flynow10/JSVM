import { parser } from "./parser/index.js";
import { instructions } from "../instructions/index.js";
import { instructionTypes as I } from "../instructions/meta.js";
import { registers } from "../registers.js";

export const assemble = (program, debug = false) => {
  program = program.trim();

  if (debug) {
    console.log("Program code: \n" + program);
  }

  const registerMap = registers.reduce((map, regName, index) => {
    map[regName] = index;
    return map;
  }, {});

  const parsedOutput = parser.run(program);

  if (parsedOutput.isError) {
    throw new Error(parsedOutput.error);
  }

  const machineCode = [];
  const symbolicNames = {};
  const structures = {};
  let currentAddress = 0;

  parsedOutput.result.forEach((node) => {
    switch (node.type) {
      case "LABEL":
        if (node.value in symbolicNames || node.value in structures) {
          throw new Error(
            `Can't create label ${node.value} because a binding with this name already exists.`
          );
        }
        symbolicNames[node.value] = currentAddress;
        break;
      case "CONSTANT":
        if (node.value.name in symbolicNames || node.value.name in structures) {
          throw new Error(
            `Can't create constant ${node.value} because a binding with this name already exists.`
          );
        }
        symbolicNames[node.value.name] =
          parseInt(node.value.value.value, 16) & 0xffff;
        break;
      case "DATA":
        if (node.value.name in symbolicNames || node.value.name in structures) {
          throw new Error(
            `Can't create data ${node.value} because a binding with this name already exists.`
          );
        }
        symbolicNames[node.value.name] = currentAddress;
        const sizeOfEachValueInBytes = node.value.size === 16 ? 2 : 1;
        const totalSizeOfDataInBytes =
          sizeOfEachValueInBytes * node.value.values.length;
        currentAddress += totalSizeOfDataInBytes;
        break;
      case "STRUCTURE":
        if (node.value.name in symbolicNames || node.value.name in structures) {
          throw new Error(
            `Can't create data ${node.value} because a binding with this name already exists.`
          );
        }

        structures[node.value.name] = {
          members: {},
        };

        let offset = 0;
        for (let { key, value } of node.value.members) {
          structures[node.value.name].members[key] = {
            offset,
            size: parseInt(value.value, 16) & 0xffff,
          };
          offset += structures[node.value.name].members[key].size;
        }
        break;
      default:
        const metadata = instructions[node.value.instruction];
        currentAddress += metadata.size;
    }
  });

  const getNodeValue = (node) => {
    switch (node.type) {
      case "INTERPRET_AS":
        const structure = structures[node.value.structure];
        if (!structure) {
          throw new Error(
            `structure "${node.value.structure}" wasn't resolved.`
          );
        }

        const member = structure.members[node.value.property];
        if (!member) {
          throw new Error(
            `property "${node.value.property}" in structure "${node.value.structure}" wasn't resolved.`
          );
        }
        if (!(node.value.symbol in symbolicNames)) {
          throw new Error(`symbol "${node.value.symbol}" wasn't resolved.`);
        }
        const symbol = symbolicNames[node.value.symbol];
        return symbol + member.offset;
      case "VARIABLE":
        if (!(node.value in symbolicNames)) {
          throw new Error(`label ${node.value} wasn't resolved.`);
        }
        return symbolicNames[node.value];
      case "HEX_LITERAL":
      case "ADDRESS":
        return parseInt(node.value, 16);
      case "BINARY_OPERATION":
        const a = getNodeValue(node.value.a);
        const b = getNodeValue(node.value.b);
        switch (node.value.op.type) {
          case "OP_PLUS":
            return (a + b) & 0xffff;
          case "OP_MINUS":
            return (a - b) & 0xffff;
          case "OP_MULTIPLY":
            return (a * b) & 0xffff;
        }
        throw new Error(`Unsupported binary operation: ${node.value.op.type}`);
      default:
        throw new Error(`Unsupported node type: ${node.type}`);
    }
  };

  const encodeLitOrMem = (node) => {
    let hexVal = getNodeValue(node);
    const highByte = (hexVal & 0xff00) >> 8;
    const lowByte = hexVal & 0x00ff;
    machineCode.push(highByte, lowByte);
  };

  const encodeLit8 = (lit) => {
    let hexVal = getNodeValue(lit);
    const lowByte = hexVal & 0x00ff;
    machineCode.push(lowByte);
  };

  const encodeReg = (reg) => {
    const mappedReg = registerMap[reg.value];
    machineCode.push(mappedReg);
  };

  const encodeData8 = (node) => {
    for (let byte of node.value.values) {
      const parsed = parseInt(byte.value, 16);
      machineCode.push(parsed & 0xff);
    }
  };

  const encodeData16 = (node) => {
    for (let byte of node.value.values) {
      const parsed = parseInt(byte.value, 16);
      machineCode.push((parsed & 0xff00) >> 8);
      machineCode.push(parsed & 0x00ff);
    }
  };

  parsedOutput.result.forEach((node) => {
    if (
      node.type === "LABEL" ||
      node.type === "CONSTANT" ||
      node.type === "STRUCTURE"
    ) {
      return;
    }

    if (node.type === "DATA") {
      if (node.value.size === 8) {
        encodeData8(node);
      } else {
        encodeData16(node);
      }
      return;
    }

    const metadata = instructions[node.value.instruction];
    machineCode.push(metadata.opcode);

    if ([I.litReg, I.memReg, I.litMemRegPtr].includes(metadata.type)) {
      encodeLitOrMem(node.value.args[0]);
      encodeReg(node.value.args[1]);
    }
    if ([I.regLit, I.regMem].includes(metadata.type)) {
      encodeReg(node.value.args[0]);
      encodeLitOrMem(node.value.args[1]);
    }
    if (I.regLit8 === metadata.type) {
      encodeReg(node.value.args[0]);
      encodeLit8(node.value.args[1]);
    }
    if ([I.regReg, I.regPtrReg].includes(metadata.type)) {
      encodeReg(node.value.args[0]);
      encodeReg(node.value.args[1]);
    }
    if (I.litMem === metadata.type) {
      encodeLitOrMem(node.value.args[0]);
      encodeLitOrMem(node.value.args[1]);
    }
    if (I.litOffReg === metadata.type) {
      encodeLitOrMem(node.value.args[0]);
      encodeReg(node.value.args[1]);
      encodeReg(node.value.args[2]);
    }
    if (I.singleReg === metadata.type) {
      encodeReg(node.value.args[0]);
    }
    if ([I.singleLit, I.singleMem].includes(metadata.type)) {
      encodeLitOrMem(node.value.args[0]);
    }
  });
  if (debug) {
    console.log(
      "Machine code:",
      machineCode
        .map((byte) => "0x" + byte.toString(16).padStart(2, "0"))
        .join(", ")
    );
  }
  return machineCode;
};
