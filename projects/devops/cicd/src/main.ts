//import * as path from 'path';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { CICDProduct } from './lib/cicd-product';
//import { SCCIProduct } from './lib/sc-ci-product';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...

    new servicecatalog.CloudFormationProduct(this, 'CICDPipeline', {
      productName: 'cicd-pipeline-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'SC Elastic Beanstalk Product',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new CICDProduct(this, 'CICDPipelineProduct', {})),
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
new MyStack(app, 'cicd', { env: devEnv, stackName: `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}` });
// new MyStack(app, 'cicd-prod', { env: prodEnv });

app.synth();