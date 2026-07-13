const tokenizeNodeOptionsEnv = (nodeOptions) => {
  const environmentArgv = [];
  let isInString = false;
  let willStartNewArgument = true;
  for (let index = 0; index < nodeOptions.length; index += 1) {
    let character = nodeOptions[index];
    if (character === "\\" && isInString) {
      if (index + 1 === nodeOptions.length) {
        return environmentArgv;
      }
      index += 1;
      character = nodeOptions[index];
    } else if (character === " " && !isInString) {
      willStartNewArgument = true;
      continue;
    } else if (character === '"') {
      isInString = !isInString;
      continue;
    }
    if (willStartNewArgument) {
      environmentArgv.push(character);
      willStartNewArgument = false;
    } else {
      environmentArgv[environmentArgv.length - 1] += character;
    }
  }
  return environmentArgv;
};

const scanSource = (flag, tokens, value) => {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.length <= 1 || token[0] !== "-") {
      continue;
    }
    const equalsIndex = token[1] === "-" ? token.indexOf("=") : -1;
    let name = equalsIndex === -1 ? token : token.slice(0, equalsIndex);
    if (name.includes("_", 2)) {
      name = name.slice(0, 2) + name.slice(2).replaceAll("_", "-");
    }
    for (const form of flag.forms) {
      const [match, mode] = form;
      if (name !== match || (mode === 3 || mode === 5) && equalsIndex === -1) {
        continue;
      }
      const hasFixedValue = mode === 4 || mode === 5;
      const effect = mode >= 3 ? 0 : mode;
      let raw = hasFixedValue ? form[2] : "";
      if (effect === 0 && !hasFixedValue) {
        if (equalsIndex === -1) {
          index += 1;
          raw = tokens[index] ?? "";
          if (raw[0] === "\\" && raw[1] === "-") {
            raw = raw.slice(1);
          }
        } else {
          raw = token.slice(equalsIndex + 1);
        }
      }
      value = flag.fold(raw, value, effect);
      break;
    }
  }
  return value;
};
const getOptionValue = (flag) => {
  let value = flag.init();
  const nodeOptions = process.env.NODE_OPTIONS;
  if (nodeOptions) {
    value = scanSource(flag, tokenizeNodeOptionsEnv(nodeOptions), value);
  }
  value = scanSource(flag, process.execArgv, value);
  return value;
};

export { getOptionValue };
