import * as A from "arcsecond";
import * as T from "./types.js";
import { register, hexLiteral, upperOrLowerStr, address } from "./common.js";
import { squareBracketExpr } from "./expressions.js";

const litReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const arg1 = yield A.choice([hexLiteral, squareBracketExpr]);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const arg2 = yield register;
    yield A.optionalWhitespace;

    return T.instruction({
      instruction: type,
      args: [arg1, arg2],
    });
  });

const regLit = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const r1 = yield register;

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const lit = yield A.choice([hexLiteral, squareBracketExpr]);

    yield A.optionalWhitespace;

    return T.instruction({
      instruction: type,
      args: [r1, lit],
    });
  });

const regReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const r1 = yield register;

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const r2 = yield register;
    yield A.optionalWhitespace;

    return T.instruction({
      instruction: type,
      args: [r1, r2],
    });
  });

const regMem = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const r1 = yield register;

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const addr = yield A.choice([
      address,
      A.char("&").chain(() => squareBracketExpr),
    ]);
    yield A.optionalWhitespace;

    return T.instruction({
      instruction: type,
      args: [r1, addr],
    });
  });

const memReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const addr = yield A.choice([
      address,
      A.char("&").chain(() => squareBracketExpr),
    ]);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const r1 = yield register;

    yield A.optionalWhitespace;

    return T.instruction({
      instruction: type,
      args: [addr, r1],
    });
  });

const litMem = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const lit = yield A.choice([hexLiteral, squareBracketExpr]);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const addr = yield A.choice([
      address,
      A.char("&").chain(() => squareBracketExpr),
    ]);
    yield A.optionalWhitespace;

    return T.instruction({
      instruction: type,
      args: [lit, addr],
    });
  });

const regPtrReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const r1 = yield A.char("&").chain(() => register);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const r2 = yield register;
    yield A.optionalWhitespace;

    return T.instruction({
      instruction: type,
      args: [r1, r2],
    });
  });

const litOffReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const lit = yield A.choice([hexLiteral, squareBracketExpr]);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const r1 = yield A.char("&").chain(() => register);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const r2 = yield register;

    yield A.optionalWhitespace;

    return T.instruction({
      instruction: type,
      args: [lit, r1, r2],
    });
  });

const litMemRegPtr = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const lit = yield A.choice([hexLiteral, squareBracketExpr]);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const reg = yield A.str("&(").chain(() => register);
    yield A.char(")");

    yield A.optionalWhitespace;

    return T.instruction({
      instruction: type,
      args: [lit, reg],
    });
  });

const noArgs = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.optionalWhitespace;

    return T.instruction({
      instruction: type,
      args: [],
    });
  });
const singleReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const r1 = yield register;

    yield A.optionalWhitespace;
    return T.instruction({
      instruction: type,
      args: [r1],
    });
  });

const singleLit = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const lit = yield A.choice([hexLiteral, squareBracketExpr]);

    yield A.optionalWhitespace;
    return T.instruction({
      instruction: type,
      args: [lit],
    });
  });
const singleMem = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerStr(mnemonic);
    yield A.whitespace;

    const addr = yield A.choice([
      address,
      A.char("&").chain(() => squareBracketExpr),
    ]);

    yield A.optionalWhitespace;
    return T.instruction({
      instruction: type,
      args: [addr],
    });
  });

export const formats = {
  litReg,
  regReg,
  regLit,
  regLit8: regLit,
  regMem,
  memReg,
  litMem,
  regPtrReg,
  litOffReg,
  litMemRegPtr,
  noArgs,
  singleReg,
  singleLit,
  singleMem,
};
