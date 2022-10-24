import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';
import { ArgoCDConstruct } from './argocd-construct';
//import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';

export interface EcsFargateProductProps extends cdk.StackProps {

}

export class EksGitopsProduct extends servicecatalog.ProductStack {
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
              'DevStage',
              'ProdStage',
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
        ],
      },
    };

    const projectName = new cdk.CfnParameter(this, 'ProjectName', {
      description: 'The name of the Project Name',
      type: 'String',
      default: 'acme',
    });

    const devStage = new cdk.CfnParameter(this, 'DevStage', {
      description: 'Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const prodStage = new cdk.CfnParameter(this, 'ProdStage', {
      description: 'Environment',
      type: 'String',
      default: 'prod',
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

    // Prerequisites CodePipeline
    const sourceOutput = new codepipeline.Artifact('Source');

    // SourceAction
    // 1.1 Github Source Action
    const githubSourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GITHUB',
      owner: repoOwner.valueAsString,
      repo: repoName.valueAsString,
      branch: repoBranch.valueAsString,
      oauthToken: cdk.SecretValue.secretsManager(secretKey.valueAsString),
      output: sourceOutput,
    });

    const artifactS3 = s3.Bucket.fromBucketName(this, 'SourceS3', sourceArtifact.valueAsString);

    // 1.1 Github Pipeline
    const githubPipeline = new codepipeline.Pipeline(this, 'GitHub', {
      pipelineName: `${serviceName.valueAsString}-gitops-pipeline`,
      artifactBucket: artifactS3,
    });

    artifactS3.grantReadWrite(githubPipeline.role);

    githubPipeline.addStage({ stageName: 'SOURCE' }).addAction(githubSourceAction);

    new ArgoCDConstruct(this, 'DEV', {
      pipeline: githubPipeline,
      projectName: projectName.valueAsString,
      environment: devStage.valueAsString,
      repoName: repoName.valueAsString,
      repoOwner: repoOwner.valueAsString,
      serviceName: serviceName.valueAsString,
      sourceArtifact: sourceOutput,
      buildType: 'DOCKER',
      envType: 'eks',
      enableAutoSync: 'true',
    });

    githubPipeline.addStage({
      stageName: 'Approval',
      actions: [new codepipeline_actions.ManualApprovalAction({
        actionName: 'ApproveChanges',
      })],
    });


    new ArgoCDConstruct(this, 'PROD', {
      pipeline: githubPipeline,
      projectName: projectName.valueAsString,
      environment: prodStage.valueAsString,
      repoName: repoName.valueAsString,
      repoOwner: repoOwner.valueAsString,
      serviceName: serviceName.valueAsString,
      sourceArtifact: sourceOutput,
      buildType: 'DOCKER',
      envType: 'eks',
      enableAutoSync: 'false',
    });

  }
}