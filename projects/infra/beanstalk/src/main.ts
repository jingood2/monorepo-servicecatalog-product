import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { SCProductBeanstalkDockerStack } from './lib/beanstalk-product';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'sc-beanstalk-product', {
      productName: 'beanstalk-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'SC Elastic Beanstalk Product',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new SCProductBeanstalkDockerStack(this, 'BeanstalkDockerProduct', {})),
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

new MyStack(app, 'beanstalk', {
  env: devEnv,
  stackName: `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
});

// new MyStack(app, 'beanstalk-prod', { env: prodEnv });

app.synth();