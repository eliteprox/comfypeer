/**
 * node:test loads TypeScript with extensionless relative imports
 * (`./app-url`). Node's type stripper does not resolve those, and the
 * existing lib tests are written that way. This hook appends `.ts`.
 */
import { registerHooks } from "node:module";
import path from "node:path";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      path.extname(specifier) === ""
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
