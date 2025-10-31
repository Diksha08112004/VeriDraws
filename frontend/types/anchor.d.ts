declare module '@project-serum/anchor' {
  export * from '@project-serum/anchor/dist/cjs/index';
}

declare module '*.json' {
  const value: any;
  export default value;
}
