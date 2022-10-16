import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';

import { Construct } from 'constructs/lib/construct';
import { CIConstruct } from './ci-construct';
import { ComposeToCfn } from './compose-to-cfn';
//import { CDConstruct } from './cd-construct';


export interface StackNameProps extends cdk.StackProps {

}

export class DockerComposeECSCICD extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: StackNameProps) {
    super(scope, id);

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Git Repository Common Information',
            },
            Parameters: [
              'SourceProviderType',
              'RepoName',
              'RepoBranch',
            ],
          },
          {
            Label: {
              default: 'GitHub Information',
            },
            Parameters: [
              'RepoOwner',
              'GithubSecretTokenId',
            ],
          },
          {
            Label: {
              default: 'Configuration for Codebuild',
            },
            Parameters: [
              'ServiceName',
              'sourceArtifact',
              'vpcId',
              'albArn',
            ],
          },
        ],
      },
    };

    // Define Parameters
    /* const provider = new cdk.CfnParameter(this, 'SourceProviderType', {
      type: 'String',
      description: 'Source Provider Type',
      default: 'GITHUB',
      allowedValues: ['GITHUB', 'CODECOMMIT', 'JENKINS', 'BITBUCKET', 'S3', 'GENERAL'],
    }); */

    // Informations of Tag Convention
    const projectName = new cdk.CfnParameter(this, 'ProjectName', {
      description: 'The name of the Project Name',
      type: 'String',
      default: 'acme',
    });

    const environment = new cdk.CfnParameter(this, 'Environment', {
      description: 'The name of the Environment',
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
      description: 'Service Name',
      default: 'demoapp',
    });

    const containerPort = new cdk.CfnParameter(this, 'ContainerPort', {
      type: 'Number',
      description: 'Container Port',
      default: '80',
    });

    const sourceArtifact = new cdk.CfnParameter(this, 'S3BucketSourceArtifacts', {
      type: 'String',
      description: 'S3 Bucket Name for Source and Build Artifact',
      default: 'acme-servicecatalog-cicd-bucket',
    });

    const envType = new cdk.CfnParameter(this, 'EnvType', {
      type: 'String',
      description: 'Source Packaging Tool',
      default: 'beanstalk',
      allowedValues: ['ecs', 'fargate', 'eks', 'beanstalk', 'lambda'],
    });

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID for ECS Cluster',
    });

    const albArn = new cdk.CfnParameter(this, 'AlbArn', {
      type: 'String',
      description: 'external alb arn',
    });

    const ci = new CIConstruct(this, 'CD', {
      repoName: repoName.valueAsString,
      repoOwner: repoOwner.valueAsString,
      repoBranch: repoBranch.valueAsString,
      secretKey: secretKey.valueAsString,
      serviceName: serviceName.valueAsString,
      containerPort: containerPort.valueAsNumber,
      sourceArtifact: sourceArtifact.valueAsString,
      buildType: 'DOCKER',
      envType: envType.valueAsString,
    },
    );

    new ComposeToCfn(this, 'DockerComposeToCICD', {
      imageTag: ci.imageTag,
      projectName: projectName.valueAsString,
      environment: environment.valueAsString,
      serviceName: serviceName.valueAsString,
      ecrRepoName: serviceName.valueAsString,
      containerPort: containerPort.valueAsNumber, // only use beanstalk
      deployTargetType: envType.valueAsString,
      pipeline: ci.pipeline,
      sourceArtifact: sourceArtifact.valueAsString,
      vpcId: vpcId.valueAsString,
      existingAlbArn: albArn.valueAsString,
      sourceOutput: ci.sourceOutput,
      ecrRepoUri: ci.ecrRepoUri,
    });

  }
}