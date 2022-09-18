import path from 'path';
import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'VPCPeeringAccepterProduct', {
      description: 'vpc peering connection accepter',
      productName: 'Network VPC Peering Connection Accepter Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'vpc peering connection accepter',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './lib/cfn-template/vpc-peering-connection-accepter.template.yaml'),
          ),
        },
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'VPCPeeringRequesterProduct', {
      description: 'vpc peering connection requester',
      productName: 'Network VPC Peering Connection Requester Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
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

new MyStack(app, 'vpc-peering', { 
  env: devEnv, 
  stackName: `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
 });// new MyStack(app, 'security-group-prod', { env: prodEnv });
// new MyStack(app, 'vpc-peering-prod', { env: prodEnv });

app.synth();