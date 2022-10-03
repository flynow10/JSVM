export const asType = (type) => (value) => ({ type, value });
export const mapJoin = (parser) => parser.map((items) => items.join(""));
