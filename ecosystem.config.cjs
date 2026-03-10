module.exports = {
  apps: [
    {
      name: 'hotelpos',
      script: 'server.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        JWT_SECRET: 'super-secret-pos-key'
      }
    }
  ]
};
