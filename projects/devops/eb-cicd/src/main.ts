//import * as path from 'path';
import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { EBCICodeCommitProduct } from './lib/product-codecommit';
import { ECSCodeCommitCICDProduct } from './lib/product-ecs-codecommit';
import { ECSGithubCICDProduct } from './lib/product-ecs-github';
import { EBCIGithubProduct } from './lib/product-github';
//import { SCCIProduct } from './lib/sc-ci-product';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...

    new servicecatalog.CloudFormationProduct(this, 'EBCICDPipeline', {
      productName: 'eb-cicd-pipeline-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'SC Elastic Beanstalk CICD Pipeline Product',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'Elastic Beanstalk CICD Pieline with Github',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new EBCIGithubProduct(this, 'CIGithubPipelineProduct', {})),
        },
        {
          productVersionName: 'v2',
          description: 'Elastic Beanstalk CICD Pieline with CodeCommit',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new EBCICodeCommitProduct(this, 'CICodeCommitPipelineProduct', {})),
        },
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'ECSCICDPipeline', {
      productName: 'ecs-cicd-pipeline-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'SC ECS CICD Pipeline Product',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'ECS CICD Pieline with Github',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ECSGithubCICDProduct(this, 'ECSGithubCICDProduct', {})),
        },
        {
          productVersionName: 'v2',
          description: 'ECS CICD Pipeline with CodeCommit',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ECSCodeCommitCICDProduct(this, 'ECSCodeCommitCICDProduct', {})),
        },
      ],
    });

    /*  // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'CIPipeline', {
      description: 'new-ci-pipeline-product',
      productName: 'new-ci-pipeline-product',
      distributor: 'jingood2@sk.com',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './lib/cfn-template/ci-product.template.yml'),
          ),
        },
      ],
    }); */


  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

//new MyStack(app, 'cicd-dev', { env: devEnv });
new MyStack(app, 'eb-cicd', { 
  env: devEnv, stackName: 
  `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
 });
// new MyStack(app, 'cicd-prod', { env: prodEnv });

app.synth();