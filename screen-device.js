const eraseScreen = () => {
  process.stdout.write("\x1b[2J");
};

const setBold = () => {
  process.stdout.write("\x1b[2m");
};

const setRegular = () => {
  process.stdout.write("\x1b[0m");
};

const moveTo = (x, y) => {
  process.stdout.write(`\x1b[${y};${x}H`);
};

export const createScreenDevice = () => {
  return {
    getUint16: () => 0,
    getUint8: () => 0,
    setUint16: (address, data) => {
      const command = (data & 0xff00) >> 8;
      var characterValue = data;
      if ((command & 0xf0) === 0xf0) {
        characterValue &= 0x00ff;
        if (command === 0xff) {
          eraseScreen();
        } else if (command === 0xf1) {
          setBold();
        } else if (command === 0xf2) {
          setRegular();
        }
      }

      const x = (address % 32) + 1;
      const y = Math.floor(address / 32) + 1;
      moveTo(x, y);
      const character = String.fromCharCode(characterValue);
      process.stdout.write(character);
    },
  };
};
