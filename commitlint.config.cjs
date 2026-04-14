/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // new feature
        'fix', // bug fix
        'docs', // documentation only
        'style', // formatting, no logic change
        'refactor', // refactoring without fix or feat
        'perf', // performance improvement
        'test', // adding or updating tests
        'build', // build tools, dependencies
        'ci', // CI/CD
        'chore', // maintenance, background tasks
        'revert', // revert a previous commit
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};
