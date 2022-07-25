import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { EC2ASGWithLaunchTemplate } from './lib/ec2-autoscaling-with-launchtemplate';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
     // Create a product from a stack
     new servicecatalog.CloudFormationProduct(this, "EC2LaunchTEmplateProduct", {
      productName: "EC2 LaunchTemplate Product",
      owner: "SK Cloud Transformation Group",
      productVersions: [
        {
          productVersionName: "v1.0",
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new EC2ASGWithLaunchTemplate(this, "Ec2LaunchTemplateWithAutoscaling", {})),
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

new MyStack(app, "my-new-stack", { env: devEnv, stackName: `sc-${process.env.PROJECT_NAME}-${process.env.STAGE}` });
app.synth();