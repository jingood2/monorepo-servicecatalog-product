import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';
import { CIConstruct } from './ci-construct';

export interface EcsFargateProductProps extends cdk.StackProps {

}

export class EksCiProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: EcsFargateProductProps) {
    super(scope, id);

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Default Information',
            },
            Parameters: [
              'ProjectName',
              'Environment',
              'ServiceName',
            ],
          },
          {
            Label: {
              default: 'Git Repository Common Information',
            },
            Parameters: [
              'SourceProviderType',
              'RepoName',
              'RepoBranch',
              'RepoOwner',
              'GithubSecretTokenId',
            ],
          },
        ],
      },
    };

    const projectName = new cdk.CfnParameter(this, 'ProjectName', {
      description: 'The name of the Project Name',
      type: 'String',
      default: 'acme',
    });

    const environment = new cdk.CfnParameter(this, 'Environment', {
      description: 'Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const repoName = new cdk.CfnParameter(this, 'RepoName', {
      type: 'String',
      description: 'Git Repository or S3 Bucket Name',
    });

    const repoOwner= new cdk.CfnParameter(this, 'RepoOwner', {
      default: 'main',
    });

    const repoBranch = new cdk.CfnParameter(this, 'RepoBranch', {
      default: 'main',
    });

    const secretKey = new cdk.CfnParameter(this, 'Github Secret Token Id', {
      type: 'String',
      description: '(Github Only Use)Secret Token Id for Github',
    });

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'This will set the Container, Task Definition, and Service name in Fargate',
      default: 'demoapp',
    });

    const sourceArtifact = new cdk.CfnParameter(this, 'S3BucketSourceArtifacts', {
      type: 'String',
      description: 'S3 Bucket Name for Source and Build Artifact',
      default: 'awstf-servicecatalog-cicd-bucket',
    });

    new CIConstruct(this, 'DokcerBuild', {
      projectName: projectName.valueAsString,
      environment: environment.valueAsString,
      repoName: repoName.valueAsString,
      repoOwner: repoOwner.valueAsString,
      repoBranch: repoBranch.valueAsString,
      secretKey: secretKey.valueAsString,
      serviceName: serviceName.valueAsString,
      sourceArtifact: sourceArtifact.valueAsString,
      buildType: 'DOCKER',
      envType: 'eks',
    });


  }
}