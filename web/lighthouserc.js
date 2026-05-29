module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyTimeout: 60000,
      url: ['http://localhost:3000/'],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
