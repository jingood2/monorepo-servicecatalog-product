import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { ECSCICDPipelineProduct } from './lib/ecs-cicd-pipeline-product';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'ECSCICDPipeline', {
      productName: 'ecs-cicd-pipeline-docker-compose-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'SC ECS CICD Pipeline Using Docker Compose Product',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'ECS CICD Pieline with Github',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ECSCICDPipelineProduct(this, 'ECSGithubCICDProduct', {})),
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

new MyStack(app, 'ecs-cicd', { 
  env: devEnv, stackName: 
  `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
 });
// new MyStack(app, 'ecs-cicd-prod', { env: prodEnv });

app.synth();