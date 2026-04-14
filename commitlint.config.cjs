/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // nouvelle fonctionnalité
        'fix', // correction de bug
        'docs', // documentation
        'style', // formatage, pas de changement logique
        'refactor', // refactoring sans fix ni feat
        'perf', // amélioration de performances
        'test', // ajout/modification de tests
        'build', // outils de build, dépendances
        'ci', // CI/CD
        'chore', // maintenance, tâches de fond
        'revert', // revert d'un commit précédent
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};
