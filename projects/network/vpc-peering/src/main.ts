import path from 'path';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'VPCProduct', {
      description: 'Network VPC Peering Product',
      productName: 'Network VPC Peering Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1-peering-accepter',
          description: 'vpc peering connection accepter',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './lib/cfn-template/vpc-peering-connection-accepter.template.yaml'),
          ),
        },
        {
          productVersionName: 'v1-peering-requester',
          description: 'vpc peering connection requester',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './lib/cfn-template/vpc-peering-connection.template.yaml'),
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

const app = new App();

new MyStack(app, 'vpc-peering-dev', { env: devEnv });
// new MyStack(app, 'vpc-peering-prod', { env: prodEnv });

app.synth();