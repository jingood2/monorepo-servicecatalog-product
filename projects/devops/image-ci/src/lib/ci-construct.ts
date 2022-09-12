import fs from 'fs';
import path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import { CfnPipeline } from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { Construct } from 'constructs/lib/construct';
import yaml from 'yaml';


export interface StackNameProps extends cdk.StackProps {
  provider: string;
  repoName: string;
  repoOwner: string;
  repoBranch: string;
  secretKey: string;
  serviceName: string;
  containerPort: number;
  sourceArtifact: string;
  buildType: string;
  envType: string;
}

export class CIConstruct extends Construct {
  constructor(scope: Construct, id: string, props: StackNameProps) {
    super(scope, id);

    // Define Parameters
    /* const provider = new cdk.CfnParameter(this, 'SourceProviderType', {
      type: 'String',
      description: 'Source Provider Type',
      default: 'GITHUB',
      allowedValues: ['GITHUB', 'CODECOMMIT', 'JENKINS', 'BITBUCKET', 'S3', 'GENERAL'],
    }); */

    // Informations of Tag Convention
    /* const projectName = new cdk.CfnParameter(this, 'ProjectName', {
      description: 'The name of the Project Name',
      type: 'String',
      default: 'acme',
    });

    const environment = new cdk.CfnParameter(this, 'Environment', {
      description: 'The name of the Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    }); */

    /* const repoName = new cdk.CfnParameter(this, 'RepoName', {
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
    }); */

    // Prerequisites CodePipeline
    const sourceOutput = new codepipeline.Artifact('Source');
    const buildOutput = new codepipeline.Artifact('Build');


    // 1. Define Pipeline Source Action
    // Source Action

    const IsGithubCondition = new cdk.CfnCondition(this, 'IsGithubCondition', {
      expression: cdk.Fn.conditionEquals('GITHUB', props.provider),
    });

    const IsCodecommitCondition = new cdk.CfnCondition(this, 'IsCodecommitCondition', {
      expression: cdk.Fn.conditionEquals('CODECOMMIT', props.provider),
    });

    const IsS3Condition = new cdk.CfnCondition(this, 'IsS3Condition', {
      expression: cdk.Fn.conditionEquals('S3', props.provider),
    });


    const ecrRepository = new ecr.Repository(this, 'ECRRepositoryName', {
      repositoryName: props.serviceName,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // SourceAction
    // 1.1 Github Source Action
    const githubSourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GITHUB',
      owner: props.repoOwner,
      repo: props.repoName,
      branch: props.repoBranch,
      oauthToken: cdk.SecretValue.secretsManager(props.secretKey),
      output: sourceOutput,
    });

    // 1.2 Codecommit Source Action
    const CodeCommitSourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'SOURCE',
      repository: codecommit.Repository.fromRepositoryName(this, 'GitRepository', props.repoName),
      branch: props.repoBranch,
      output: sourceOutput,
    });

    // 1.3 S3 Source Action
    const sourceBucket = new s3.CfnBucket(this, 'MyBucket', {
      bucketName: props.repoName,
      versioningConfiguration: { status: 'Enabled' },
    });
    sourceBucket.cfnOptions.condition = IsS3Condition;

    const S3SourceAction = new codepipeline_actions.S3SourceAction({
      actionName: 'S3Source',
      bucket: s3.Bucket.fromBucketArn(this, 'Bucket', sourceBucket.attrArn),
      bucketKey: `${props.repoBranch}/${props.serviceName}.zip`,
      output: sourceOutput,
    });

    // generate image tag
    /* const imageTag = cdk.Fn.conditionIf(IsGithubCondition.logicalId, githubSourceAction.variables.commitId,
      cdk.Fn.conditionIf(IsCodecommitCondition.logicalId,
        CodeCommitSourceAction.variables.commitId, S3SourceAction.variables.versionId),
    ); */

    // Configure Build Action
    const buildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-ci-v2.yaml'), 'utf8'));

    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject(buildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3, // for arm64/v8 cpu platform
        privileged: true,
      },
      environmentVariables: {
        REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        CONTAINER_PORT: { value: props.containerPort },
        BUILD_TYPE: { value: props.buildType },
        TARGET_TYPE: { value: props.envType },
        SERVICE_NAME: { value: props.serviceName },
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
    });

    const artifactS3 = s3.Bucket.fromBucketName(this, 'SourceS3', props.sourceArtifact);

    // 1.1 Github Pipeline
    const githubPipeline = new codepipeline.Pipeline(this, 'GitHub', {
      pipelineName: `${props.serviceName}-pipeline`,
      artifactBucket: artifactS3,
    });

    githubPipeline.addStage({ stageName: 'SOURCE' }).addAction(githubSourceAction);
    githubPipeline.addStage({ stageName: 'BUILD', actions: [buildAction] });
    (githubPipeline.node.defaultChild as CfnPipeline).cfnOptions.condition = IsGithubCondition;


    // 1.2 CodeCommit Pipeline
    const codecommitPipeline = new codepipeline.Pipeline(this, 'CodeCommit', {
      pipelineName: `${props.serviceName}-pipeline`,
      artifactBucket: artifactS3,
    });
    codecommitPipeline.addStage({ stageName: 'SOURCE' }).addAction(CodeCommitSourceAction);
    codecommitPipeline.addStage({ stageName: 'BUILD', actions: [buildAction] });
    (codecommitPipeline.node.defaultChild as CfnPipeline).cfnOptions.condition = IsCodecommitCondition;


    // 1.3 S3 Pipeline
    const s3Pipeline = new codepipeline.Pipeline(this, 'S3', {
      pipelineName: `${props.serviceName}-pipeline`,
      artifactBucket: artifactS3,
    });
    s3Pipeline.addStage({ stageName: 'SOURCE' }).addAction(S3SourceAction);
    s3Pipeline.addStage({ stageName: 'BUILD', actions: [buildAction] });
    (s3Pipeline.node.defaultChild as CfnPipeline).cfnOptions.condition = IsS3Condition;

  }
}