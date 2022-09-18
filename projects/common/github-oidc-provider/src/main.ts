
import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import path from 'path';
//import { GithubOidcProviderConstruct } from './github-oidc-provider-construct';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    /*  const owner = new CfnParameter(this, "GithubOwner", {
       type: "String",
       description: "GitHub Owner",
       default: "jingood2",
     });

     const repo = new CfnParameter(this, "GithubRepo", {
       type: "String",
       description: "GitHub Repository",
       default: "monorepo-cdk-project",
     });
   
     const role = new CfnParameter(this, "GithubRole", {
       type: "String",
       description: "GitHub Role",
       default: "jingood2",
     }); */

    new servicecatalog.CloudFormationProduct(this, "GithubOIDCProduct", {
      productName: "Github OIDC Provider Product",
      distributor: 'jignood2@sk.com',
      owner: "SK Cloud Transformation Group",
      productVersions: [
        /* {
          productVersionName: "v1.0",
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new GithubOidcProviderConstruct(this, "GithubOIDCProvider", {
              owner: owner.valueAsString,
              repo: repo.valueAsString,
              role: role.valueAsString,
            }),
          ),
        }, */
        {
          productVersionName: "v1",
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(path.join(__dirname, "github-oidc-provider.template.json")),
        },
      ],
    });
 
  }
}



// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, "my-stack", { 
  env: devEnv, stackName: 
  `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
 });

app.synth();
