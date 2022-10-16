const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.46.0',
  defaultReleaseBranch: 'main',
  name: 'cicd',

  deps: [
    'yaml',
<<<<<<< HEAD
    'randomstring',
    '@types/randomstring',
=======
>>>>>>> 41b3ed81d55ac5bc72db55c30cf7f4ce34b51964
  ],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();