"use strict";

/** Runtime stub — real package embeds a multi-MB WASM binary unused on Workers. */
function create() {
  return {
    getTransformer() {
      return undefined;
    },
    transform() {
      return null;
    },
  };
}

module.exports = { create };
module.exports.create = create;
