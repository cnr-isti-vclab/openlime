export default {
  floatPrecision: 1, 
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          convertTransform: true, 
          cleanupIds: true,
          removeUselessStrokeAndFill: true,
        },
      },
    },
  ],
};
