/**
 * Helper function to parse command line arguments into options
 * @param {string[]} args - Array of command line arguments
 * @returns {Object} Parsed options object
 */
export function parseOptions(args = []) {
  const options = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    // Check if it's a flag (starts with --)
    if (arg.startsWith("--")) {
      const flag = arg.slice(2); // Remove the --

      // Check if next argument is a value (not a flag)
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        options[flag] = args[i + 1];
        i += 2; // Skip both flag and value
      } else {
        // Boolean flag (no value)
        options[flag] = true;
        i += 1;
      }
    } else {
      // Positional argument
      if (!options._) options._ = [];
      options._.push(arg);
      i += 1;
    }
  }

  return options;
}

/**
 * Get options from Pear.config.args or process.argv
 * @returns {Object} Parsed options object
 */
export function getOptions() {
  const args = Pear?.config?.args || process.argv.slice(2);
  return parseOptions(args);
}

/**
 * Example usage:
 *
 * const options = getOptions();
 * console.log(options.dir); // "test" from ["--dir", "test"]
 * console.log(options.verbose); // true from ["--verbose"]
 * console.log(options._); // ["positional1", "positional2"] from non-flag args
 */
