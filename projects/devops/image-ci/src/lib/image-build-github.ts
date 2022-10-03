import fs from 'fs';
import path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';

import { Construct } from 'constructs/lib/construct';
import yaml from 'yaml';
//import { CDConstruct } from './cd-construct';


export interface StackNameProps extends cdk.StackProps {

}

export class ImageBuildGithub extends servicecatalog.ProductStack {
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
              'ecsCluster',
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
      default: 'awstf-servicecatalog-cicd-bucket',
    });

    const buildType = new cdk.CfnParameter(this, 'PackagingType', {
      type: 'String',
      description: 'Source Packaging Tool',
      default: 'DOCKER',
      allowedValues: ['MAVEN', 'GRADLE', 'NPM', 'PYTHON', 'DOCKER'],
    });

    const envType = new cdk.CfnParameter(this, 'EnvType', {
      type: 'String',
      description: 'Source Packaging Tool',
      default: 'beanstalk',
      allowedValues: ['ecs', 'fargate', 'eks', 'beanstalk', 'lambda'],
    });

    // Prerequisites CodePipeline
    const sourceOutput = new codepipeline.Artifact('Source');
    const buildOutput = new codepipeline.Artifact('Build');


    // 1. Define Pipeline Source Action
    // Source Action
    const githubSourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GITHUB',
      owner: repoOwner.valueAsString,
      repo: repoName.valueAsString,
      branch: repoBranch.valueAsString,
      oauthToken: cdk.SecretValue.secretsManager(secretKey.valueAsString),
      output: sourceOutput,
    });

    const ecrRepository = new ecr.Repository(this, 'ECRRepositoryName', {
      repositoryName: serviceName.valueAsString,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    const buildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-ci-all.yaml'), 'utf8'));

    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject(buildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3, // for arm64/v8 cpu platform
        privileged: true,
      },
      environmentVariables: {
        IMAGE_TAG: { value: githubSourceAction.variables.commitId },
        REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        CONTAINER_PORT: { value: containerPort.valueAsString },
        BUILD_TYPE: { value: buildType.valueAsString },
        TARGET_TYPE: { value: envType.valueAsString },
        SERVICE_NAME: { value: serviceName.valueAsString },
        ARTIFACT_BUCKET: { value: sourceArtifact.valueAsString },
      },
      // Note: Invalid cache type: local caching is not supported for projects with environment type ARM_CONTAINER and compute type BUILD_GENERAL1_LARGE
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
    });

    ecrRepository.grantPullPush(buildProject.grantPrincipal);

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      input: sourceOutput,
      outputs: [buildOutput],
      project: buildProject,
      environmentVariables: {
        IMAGE_TAG: { value: githubSourceAction.variables.commitId },
      },
    });

    const artifactS3 = s3.Bucket.fromBucketName(this, 'SourceS3', sourceArtifact.valueAsString);

    // 1.1 Github Pipeline
    const pipeline = new codepipeline.Pipeline(this, 'GitHubPipeline', {
      pipelineName: `${serviceName.valueAsString}`,
      artifactBucket: artifactS3,
    });


    pipeline.addStage({ stageName: 'SOURCE' }).addAction(githubSourceAction);
    pipeline.addStage({ stageName: 'BUILD', actions: [buildAction] });

    /* new CDConstruct(this, 'CD', {
      imageTag: githubSourceAction.variables.commitId,
      projectName: projectName.valueAsString,
      environment: environment.valueAsString,
      serviceName: serviceName.valueAsString,
      ecrRepoName: serviceName.valueAsString,
      containerPort: containerPort.valueAsNumber, // only use beanstalk
      deployTargetType: envType.valueAsString,
      approvalStage: 'true',
      pipeline: pipeline,
      sourceArtifact: sourceArtifact.valueAsString,
      buildOutput: buildOutput,
    }); */

    const deployBuildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-cd.yaml'), 'utf8'));

    const deployProject = new codebuild.PipelineProject(this, 'CodeBuildDeployPloject', {
      buildSpec: codebuild.BuildSpec.fromObject(deployBuildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true,
      },
      environmentVariables: {
        //REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        SERVICE_NAME: { value: serviceName.valueAsString },
        ENVIRONMENT: { value: environment.valueAsString },
        DEPLOY_ENV_NAME: { value: `${projectName.valueAsString}-${envType.valueAsString}-${environment.valueAsString}` },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        ARTIFACT_BUCKET: { value: sourceArtifact.valueAsString },
        TARGET_TYPE: { value: envType.valueAsString },
      },
    });

    deployProject.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['elasticbeanstalk:*',
        'autoscaling:*',
        'elasticloadbalancing:*',
        'ecs:*',
        's3:*',
        'ec2:*',
        'cloudwatch:*',
        'logs:*',
        'cloudformation:*']
    }));

    const approvalAction = new codepipeline_actions.ManualApprovalAction({ actionName: 'Approval' });
    pipeline.addStage( { stageName: 'Approval', actions: [approvalAction] });

    const deployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Deploy',
      input: buildOutput,
      project: deployProject,
      environmentVariables: {
        IMAGE_TAG: { value: buildAction.variable('IMAGE_TAG') },
      },
    });
    pipeline.addStage( { stageName: 'DEPLOY', actions: [deployAction] });


  }
}