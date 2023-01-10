const { cli } = require('@remotion/cli');
const process = require('process');

cli()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
