// Metro bundles WOFF2 files as assets (metro.config.js); importing one gives
// its asset reference, as importing a PNG does.
declare module "*.woff2" {
  const source: number;
  export default source;
}
