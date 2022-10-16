import path from 'path';
import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
//import { ComposeToCfnCD } from './lib/compose-to-cfn-cd';
import { GithubCICDProduct } from './lib/github-cicd-product';
import { ImageBuildCodecommit } from './lib/image-build-codecommit';
import { ImageBuildGithub } from './lib/image-build-github';
import { ImageBuildS3 } from './lib/image-build-s3';
import { ImageBuildEksGithub } from './lib/image-build-eks-github';


export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'ECSCICDPipeline', {
      productName: 'image-build-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'SC CI Using Docker Compose Product',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'ECS CICD Pieline with Github',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ImageBuildGithub(this, 'CIGithubProduct', {})),
        },
        {
          productVersionName: 'v2',
          description: 'ECS CICD Pieline with CodeCommit',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ImageBuildCodecommit(this, 'CICodeCommitProduct', {})),
        },
        {
          productVersionName: 'v3',
          description: 'ECS CICD Pieline with S3',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ImageBuildS3(this, 'CIS3Product', {})),
        },
        {
          productVersionName: 'v4',
          description: 'Github CICD',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new GithubCICDProduct(this, 'GithubCICDProduct', {})),
        },
        {
          productVersionName: 'v5',
          description: 'CICD Pieline V5',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './lib/cfn-template/all.yaml'),
          ),
        },
        /* {
          productVersionName: 'v6',
          description: 'Github Docker Compose CICD',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new GithubCICDProduct(this, 'GithubDockerComposeCICDProduct', {})),
        },
        {
          productVersionName: 'v7',
          description: 'Github Docker Compose CD',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ComposeToCfnCD(this, 'GithubDockerComposeCDProduct', {})),
        }, */
        {
          productVersionName: 'v8',
          description: 'EKS CICD Pieline with Github',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ImageBuildEksGithub(this, 'CIGithubEksProduct', {})),
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

new MyStack(app, 'image-ci', {
  env: devEnv,
  stackName:
  `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
});
// new MyStack(app, 'ecs-cicd-prod', { env: prodEnv });

app.synth();