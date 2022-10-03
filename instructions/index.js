import { meta } from "./meta.js";

const indexBy = (array, prop) =>
  array.reduce((output, item) => {
    output[item[prop]] = item;
    return output;
  }, {});

export const instructions = indexBy(meta, "instruction");
