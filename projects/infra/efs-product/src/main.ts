import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { AttachEFSMount } from './lib/attach-efs-mount';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'CreateEFSFileSystemAndAccessPointProduct', {
      productName: 'Create EFS FileSystem and AccessPoint',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1.0',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new AttachEFSMount(this, 'EC2LaunchTemplate')),
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

new MyStack(app, 'efs-product-dev', { env: devEnv, stackName: `sc-${process.env.PROJECT_NAME}-${process.env.STAGE}` });
// new MyStack(app, 'efs-product-prod', { env: prodEnv });

app.synth();