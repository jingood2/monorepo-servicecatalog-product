import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { EksCiProduct } from './lib/eks-ci-product';
import { EksGitopsProduct } from './lib/eks-gitops-product';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    new servicecatalog.CloudFormationProduct(this, 'CIPipeline', {
      productName: 'container-build-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'Container Build Product',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'ECS CI Pieline with Github',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new EksCiProduct(this, 'CIGithubProduct', {})),
        },
      ],
    });
    new servicecatalog.CloudFormationProduct(this, 'EKSArgoCDPipeline', {
      productName: 'eks-argocd-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'EKS ArgoCD Product',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'ECS ArgoCD Pieline with Github',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new EksGitopsProduct(this, 'EksArgoCDProduct', {})),
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

new MyStack(app, 'eks-cicd-product', {
  env: devEnv,
  stackName:
  `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
});// new MyStack(app, 'eks-cicd-prod', { env: prodEnv });

app.synth();