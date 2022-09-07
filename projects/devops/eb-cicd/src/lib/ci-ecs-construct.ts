import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { Construct } from 'constructs/lib/construct';

import * as yaml from 'yaml';


export interface CIConstructProps {
  serviceName: string;
  servicePort: number;
  provider: string;
  repoName: string;
  repoOwner: string;
  repoBranch: string;
  githubTokenSecretId?: string;
  sourceArtifact: string;
  buildType: string;
  envType: string;
}

export class CIECSConstruct extends Construct {
  public readonly pipeline: codepipeline.Pipeline;
  public readonly buildOutput: codepipeline.Artifact;
  public readonly IMAGE_TAG: string;

  constructor(scope: Construct, id: string, props: CIConstructProps) {
    super(scope, id);

    const sourceOutput = new codepipeline.Artifact('Source');
    this.buildOutput = new codepipeline.Artifact('Build');


    const ecrRepository = new ecr.Repository(this, 'ECRRepository', {
      repositoryName: props.serviceName,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });


    /* const shouldCreateBucketCondition = new cdk.CfnCondition(this, 'ShouldCreateS3ArtifactCondition', {
        expression: cdk.Fn.conditionEquals(props.sourceArtifact, ''),
      }); */


    //var artifactS3 ;

    const artifactS3 = s3.Bucket.fromBucketName(this, 'ArtifactBucketRef', props.sourceArtifact);

    /* artifactS3 = new s3.Bucket(this, 'S3BucketsApp', {
        bucketName: `${props.serviceName}-codepipeline-artifact`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: false,
    });

    (artifactS3.node.defaultChild as s3.CfnBucket).cfnOptions.condition = shouldCreateBucketCondition;
 */

    const buildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-ci-ecs.yaml'), 'utf8'));

    const buildProject = new codebuild.PipelineProject(this, 'CIESBuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject(buildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3, // for arm64/v8 cpu platform
        privileged: true,
      },
      environmentVariables: {
        REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        SERVICE_NAME: { value: props.serviceName },
        SERVICE_PORT: { value: props.servicePort },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        BUILD_TYPE: { value: props.buildType },
        TARGET_TYPE: { value: props.envType },
        ARTIFACT_BUCKET: { value: artifactS3.bucketName },
        //AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        //AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
      },
    // Note: Invalid cache type: local caching is not supported for projects with environment type ARM_CONTAINER and compute type BUILD_GENERAL1_LARGE
    //cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
    });

    ecrRepository.grantPullPush(buildProject.grantPrincipal);

    const sourceAction = this.selectSourceAction( props.provider,
      props.repoName, props.repoBranch, sourceOutput, props.repoOwner, props.githubTokenSecretId);

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      input: sourceOutput,
      outputs: [this.buildOutput],
      project: buildProject,
    });

    // artifactBucket/pipelineName/IMAGE_TAG/Dockerrun.aws.json
    const githubPipeline = new codepipeline.Pipeline(this, 'GitHubSourcePipeline', {
      pipelineName: `${props.serviceName}`,
      artifactBucket: artifactS3,
    });

    // Source Stage
    const sourceStage = githubPipeline.addStage({ stageName: 'Source' });
    sourceStage.addAction(sourceAction);

    // Build Stage
    const buildStage = githubPipeline.addStage({ stageName: 'Build' });
    buildStage.addAction(buildAction);

    this.IMAGE_TAG = buildAction.variable('IMAGE_TAG');
    this.pipeline = githubPipeline;

  }

  private selectSourceAction(provider: string, repoName: string, branch: string,
    sourceOutput: codepipeline.Artifact, owner?: string, secretId?: string): codepipeline_actions.Action {

    console.log('Provider:' + provider);


    if ( provider === 'CODECOMMIT') {
      return new codepipeline_actions.CodeCommitSourceAction({
        actionName: 'CODECOMMIT',
        repository: codecommit.Repository.fromRepositoryName(this, 'GitRepository', repoName),
        branch: branch,
        output: sourceOutput,
      });
    }

    return new codepipeline_actions.GitHubSourceAction({
      actionName: 'GITHUB',
      owner: owner ?? '',
      repo: repoName,
      branch: branch,
      oauthToken: cdk.SecretValue.secretsManager(secretId ?? ''),
      output: sourceOutput,
    } );

  }
}