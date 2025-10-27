/// <reference types="bun-types" />
// @ts-ignore - HTML imports are supported by Bun
import index from "./index.html";

Bun.serve({
  routes: {
    "/": index,
  },
  development: {
    hmr: true,
    console: true,
  },
  port: 3000,
});
