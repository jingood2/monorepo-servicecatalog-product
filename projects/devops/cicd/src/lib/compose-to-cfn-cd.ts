import fs from 'fs';
import path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';

import yaml from 'yaml';

export interface ComposeToCfnProps extends cdk.StackProps {
}

export class ComposeToCfnCD extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: ComposeToCfnProps) {
    super(scope, id );

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Environment Information',
            },
            Parameters: [
              'ProjectName',
              'Environment',
            ],
          },
          {
            Label: {
              default: 'Github Repository Common Information',
            },
            Parameters: [
              'SourceProviderType',
              'RepoName',
              'RepoBranch',
              'RepoOwner',
              'GithubSecretTokenId',
            ],
          },
          {
            Label: {
              default: 'CodeBuild Information',
            },
            Parameters: [
              'sourceArtifact',
            ],
          },
          {
            Label: {
              default: 'Configure Docker Compose for ECS ',
            },
            Parameters: [
              'ServiceName',
              'VpcId',
              'AlbArn',
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
      type: 'String',
      default: 'main',
    });

    const repoBranch = new cdk.CfnParameter(this, 'RepoBranch', {
      type: 'String',
      default: 'main',
    });

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      default: 'demoapp',
    });

    const secretKey = new cdk.CfnParameter(this, 'Github Secret Token Id', {
      type: 'String',
      description: '(Github Only Use)Secret Token Id for Github',
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

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID for ECS Cluster',
    });

    const albArn = new cdk.CfnParameter(this, 'AlbArn', {
      type: 'String',
      description: 'external alb arn',
    });

    const sourceOutput = new codepipeline.Artifact('Source');

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
    const pipeline = new codepipeline.Pipeline(this, 'GitHub', {
      pipelineName: `${serviceName.valueAsString}`,
      artifactBucket: artifactS3,
    });

    pipeline.addStage({ stageName: 'SOURCE' }).addAction(githubSourceAction);

    const extractBuildRole = new iam.Role(this, 'ExtractBuildRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('codebuild.amazonaws.com'),
        new iam.ServicePrincipal('cloudformation.amazonaws.com'),
      ),
      description: 'CFN Extract Build Role',
    });

    extractBuildRole.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(this, 'ECRReadOnly', 'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly'));

    extractBuildRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['logs:*'],
    }));

    extractBuildRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['s3:*'],
    }));

    extractBuildRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cloudformation:*',
        'ecs:*',
        'ec2:*',
        'elasticfilesystem:*',
        'iam:*',
        'elasticloadbalancing:*',
        'application-autoscaling:*',
        'logs:*',
        'servicediscovery:*',
        'route53:*',
      ],
      resources: ['*'],
    }));


    // 3. CFN Build Stage
    const cfnSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-cfn.yaml'), 'utf8'));

    const cfnProject = new codebuild.PipelineProject(this, 'CfnBuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject(cfnSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_3_0, // for arm64/v8 cpu platform
        privileged: true,
      },
      environmentVariables: {
        //IMAGE_URI: { value: props.ecrRepoUri},
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        AWS_ECS_CLUSTER: { value: `${projectName.valueAsString}-ecs-${environment.valueAsString}` },
        AWS_VPC: { value: vpcId.valueAsString },
        AWS_ELB: { value: albArn.valueAsString },
        CONTAINER_PORT: { value: containerPort.valueAsNumber },
      },
      role: extractBuildRole,
    });

    /* cfnProject.role?.addToPrincipalPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: ['elasticbeanstalk:*',
          'autoscaling:*',
          'elasticloadbalancing:*',
          'ecs:*',
          's3:*',
          'ec2:*',
          'cloudwatch:*',
          'ecr:*',
          'logs:*',
          'cloudformation:*'],
    }));
    */
    const cfnBuildOutput = new codepipeline.Artifact('ExtrancedCfn');

    const cfnAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CfnBuildAction',
      input: sourceOutput,
      outputs: [cfnBuildOutput],
      project: cfnProject,
    });

    const cfnBuildStage = pipeline.addStage({ stageName: 'ExtractCFN' });
    cfnBuildStage.addAction(cfnAction);

    // 4. Deployment Stage: create and deploy changeset with manual approval
    const stackName = 'DockerComposeDeployOnECSStack';
    const changeSetName = 'StagedChangeSet';


    /* createChangeSetAction.deploymentRole.addToPrincipalPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['elasticbeanstalk:*',
        'autoscaling:*',
        'elasticloadbalancing:*',
        'ecs:*',
        's3:*',
        'ec2:*',
        'cloudwatch:*',
        'ecr:*',
        'logs:*',
        'cloudformation:*'],
    })); */

    /*  const exeuteAction = new codepipeline_actions.CloudFormationExecuteChangeSetAction({
      actionName: 'ExecuteChanges',
      stackName,
      changeSetName,
      runOrder: 3,
    });

    exeuteAction.actionProperties.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: ['elasticbeanstalk:*',
          'autoscaling:*',
          'elasticloadbalancing:*',
          'ecs:*',
          's3:*',
          'ec2:*',
          'cloudwatch:*',
          'ecr:*',
          'logs:*',
          'cloudformation:*'],
      }),
    ); */


    pipeline.addStage({
      stageName: 'DeployCFN',
      actions: [
        new codepipeline_actions.CloudFormationCreateReplaceChangeSetAction({
          actionName: 'PrepareChanges',
          stackName,
          changeSetName,
          adminPermissions: true,
          templatePath: cfnBuildOutput.atPath('cloudformation.yml'),
          runOrder: 1,
        }),

        new codepipeline_actions.ManualApprovalAction({
          actionName: 'ApproveChanges',
          runOrder: 2,
        }),
        new codepipeline_actions.CloudFormationExecuteChangeSetAction({
          actionName: 'ExecuteChanges',
          stackName,
          changeSetName,
          runOrder: 3,
        }),

      ],
    });
  }
}