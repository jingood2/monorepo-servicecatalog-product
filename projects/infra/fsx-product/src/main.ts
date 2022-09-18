import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { FsxForWinFileserver } from './lib/fsx-for-win-fileserver';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'CreateEFSFileSystemAndAccessPointProduct', {
      productName: 'Amazon FSx for Windows File Server',
      owner: 'SK Cloud Transformation Group',
      distributor: 'jingood2@sk.com',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new FsxForWinFileserver(this, 'FsxForWinFileserver', {})),
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

new MyStack(app, 'fsx', { 
  env: devEnv, 
  stackName: `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
 });
// new MyStack(app, 'efs-product-prod', { env: prodEnv });

app.synth();