// WalletConnect loads pino, which optionally requires this package for pretty logs.
// It is not installed, and pretty logs are not used. This stub keeps webpack from
// reporting a missing module, which Next.js otherwise shows as a dev issue badge.
function prettyFactory() {
  return function format(input) {
    return typeof input === "string" ? input : "";
  };
}

module.exports = { prettyFactory };
