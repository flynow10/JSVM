import { asType } from "./util.js";

export const register = asType("REGISTER");
export const hexLiteral = asType("HEX_LITERAL");
export const address = asType("ADDRESS");
export const variable = asType("VARIABLE");

export const opPlus = asType("OP_PLUS");
export const opMinus = asType("OP_MINUS");
export const opMultiply = asType("OP_MULTIPLY");

export const binaryOperation = asType("BINARY_OPERATION");
export const bracketedExpression = asType("BRACKETED_EXPRESSION");
export const squareBracketExpression = asType("SQUARE_BRACKET_EXPRESSION");

export const instruction = asType("INSTRUCTION");
export const label = asType("LABEL");
export const data = asType("DATA");
export const constant = asType("CONSTANT");
export const structure = asType("STRUCTURE");
export const interpretAs = asType("INTERPRET_AS");
