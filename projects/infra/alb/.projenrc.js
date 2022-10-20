const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.46.0',
  defaultReleaseBranch: 'main',
  name: 'alb',

<<<<<<< HEAD
  deps: [
    'yaml',
    'randomstring',
    '@types/randomstring',
  ],
=======
  //deps: [],
>>>>>>> b4e898f21925918a8787f71d199cf7dd49c5d127
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();