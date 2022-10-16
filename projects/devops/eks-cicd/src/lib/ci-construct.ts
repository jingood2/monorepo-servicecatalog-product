import fs from 'fs';
import path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { Construct } from 'constructs/lib/construct';
import yaml from 'yaml';


export interface StackNameProps extends cdk.StackProps {
  projectName: string;
  environment: string;
  repoName: string;
  repoOwner: string;
  repoBranch: string;
  secretKey: string;
  serviceName: string;
  sourceArtifact: string;
  buildType: string;
  envType: string;
}

export class CIConstruct extends Construct {
  public readonly pipeline: codepipeline.Pipeline;
  public readonly imageTag: string;
  public readonly sourceOutput: codepipeline.Artifact;
  public readonly buildOutput: codepipeline.Artifact;
  public readonly ecrRepoUri: string;
  public readonly codebuildAction: codepipeline_actions.CodeBuildAction;

  constructor(scope: Construct, id: string, props: StackNameProps) {
    super(scope, id);

    // Prerequisites CodePipeline
    const sourceOutput = new codepipeline.Artifact('Source');
    const buildOutput = new codepipeline.Artifact('Build');


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


    // Configure Build Action
    const buildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-ci-all.yaml'), 'utf8'));

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

    this.codebuildAction = buildAction;

    const artifactS3 = s3.Bucket.fromBucketName(this, 'SourceS3', props.sourceArtifact);

    // 1.1 Github Pipeline
    const githubPipeline = new codepipeline.Pipeline(this, 'GitHub', {
      pipelineName: `${props.serviceName}-pipeline`,
      artifactBucket: artifactS3,
    });

    artifactS3.grantReadWrite(githubPipeline.role);

    githubPipeline.addStage({ stageName: 'SOURCE' }).addAction(githubSourceAction);
    githubPipeline.addStage({ stageName: 'BUILD', actions: [buildAction] });

    this.pipeline = githubPipeline;
    this.imageTag = buildAction.variable('IMAGE_TAG');
    this.sourceOutput = sourceOutput;
    this.buildOutput = buildOutput;
    this.ecrRepoUri = ecrRepository.repositoryUri;

  }
}