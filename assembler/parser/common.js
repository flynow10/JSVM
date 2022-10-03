import * as A from "arcsecond";
import * as T from "./types.js";
import { mapJoin } from "./util.js";

export const upperOrLowerStr = (s) =>
  A.choice([A.str(s.toLowerCase()), A.str(s.toUpperCase())]);

export const register = A.choice([
  upperOrLowerStr("r1"),
  upperOrLowerStr("r2"),
  upperOrLowerStr("r3"),
  upperOrLowerStr("r4"),
  upperOrLowerStr("r5"),
  upperOrLowerStr("r6"),
  upperOrLowerStr("r7"),
  upperOrLowerStr("r8"),
  upperOrLowerStr("sp"),
  upperOrLowerStr("fp"),
  upperOrLowerStr("ip"),
  upperOrLowerStr("acc"),
  upperOrLowerStr("mb"),
  upperOrLowerStr("im"),
]).map(T.register);

const hexDigit = A.regex(/^[0-9A-Fa-f]/);

export const hexLiteral = A.char("$")
  .chain(() => mapJoin(A.many1(hexDigit)))
  .map(T.hexLiteral);

export const address = A.char("&")
  .chain(() => mapJoin(A.many1(hexDigit)))
  .map(T.address);

export const validIdentifier = mapJoin(
  A.sequenceOf([
    A.regex(/^[a-zA-Z_]/),
    A.possibly(A.regex(/^[a-zA-Z0-9_]+/)).map((x) => (x === null ? "" : x)),
  ])
);

export const label = A.sequenceOf([
  validIdentifier,
  A.char(":"),
  A.optionalWhitespace,
])
  .map(([labelName]) => labelName)
  .map(T.label);

export const variable = A.char("!")
  .chain(() => validIdentifier)
  .map(T.variable);

export const operator = A.choice([
  A.char("+").map(T.opPlus),
  A.char("-").map(T.opMinus),
  A.char("*").map(T.opMultiply),
]);

export const peek = A.lookAhead(A.regex(/^./));

const optionalWhitespaceSurrounded = A.between(A.optionalWhitespace)(
  A.optionalWhitespace
);

export const commaSeparated = A.sepBy(
  optionalWhitespaceSurrounded(A.char(","))
);
