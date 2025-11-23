// next.config.mjs
export default {
  async headers() {
    return [
      {
        source: '/(.*)', // apply to all routes
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; connect-src 'self' http://localhost:4000; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval';",
          },
        ],
      },
    ];
  },
};
