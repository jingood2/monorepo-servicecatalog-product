import path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { ContainerCodecommitCICDProduct } from './lib/container-codecommit-cicd';
import { ContainerGithubCICDProduct } from './lib/container-github-cicd';
//import { ContainerCICDProduct } from './lib/container-codecommit-cicd';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'ContrainerCICD', {
      productName: 'container-cicd-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'Container CICD Product',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'Create Github CICD Pieline product that builds and deploys containers to ECS, EKS, Beanstalk',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ContainerGithubCICDProduct(this, 'CIGithubProduct', {})),
        },
        {
          productVersionName: 'v2',
          description: 'Create Codecommit CICD Pieline product that builds and deploys containers to ECS, EKS, Beanstalk',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ContainerCodecommitCICDProduct(this, 'CICodeCommitProduct', {})),
        },
        {
          productVersionName: 'v3',
          description: 'Create CICD Pieline product that builds and deploys containers to ECS, EKS, Beanstalk',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './lib/cfn-template/all.yaml'),
          ),
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

const app = new cdk.App();

new MyStack(app, 'container-cicd', {
  env: devEnv,
  stackName:
  `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new cdk.DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
});
// new MyStack(app, 'cicd-prod', { env: prodEnv });

app.synth();