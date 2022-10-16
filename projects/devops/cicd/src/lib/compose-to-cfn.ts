import fs from 'fs';
import path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs/lib/construct';

import yaml from 'yaml';

export interface ComposeToCfnProps extends cdk.StackProps {
  imageTag: string;
  projectName: string;
  environment: string;
  serviceName: string;
  ecrRepoName?: string;
  containerPort?: number; // only use beanstalk
  //deployEnvName: string;
  deployTargetType: string;
  approvalStage?: string;
  pipeline: codepipeline.Pipeline;
  sourceArtifact: string;
  sourceOutput: codepipeline.Artifact;
  vpcId: string;
  existingAlbArn: string;
  ecrRepoUri: string;
}

export class ComposeToCfn extends Construct {
  constructor(scope: Construct, id: string, props: ComposeToCfnProps) {
    super(scope, id );

    const extractBuildRole = new iam.Role(this, 'ExtractBuildRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('codebuild.amazonaws.com'),
        new iam.ServicePrincipal('cloudformation.amazonaws.com'),
      ),
      description: 'CFN Extract Build Role',
    });

    extractBuildRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly'));

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
        IMAGE_URI: { value: props.ecrRepoUri },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        AWS_ECS_CLUSTER: { value: `${props.projectName}-ecs-${props.environment}` },
        AWS_VPC: { value: props.vpcId },
        AWS_ELB: { value: props.existingAlbArn },
        CONTAINER_PORT: { value: props.containerPort },
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
          'logs:*',
          'cloudformation:*'],
      })); */

    const cfnBuildOutput = new codepipeline.Artifact('ExtrancedCfn');

    const cfnAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CfnBuildAction',
      input: props.sourceOutput,
      outputs: [cfnBuildOutput],
      project: cfnProject,
      environmentVariables: {
        IMAGE_TAG: { value: props.imageTag },
      },
    });

    const cfnBuildStage = props.pipeline.addStage({ stageName: 'ExtractCFN' });
    cfnBuildStage.addAction(cfnAction);

    // 4. Deployment Stage: create and deploy changeset with manual approval
    const stackName = 'DockerComposeDeployOnECSStack';
    const changeSetName = 'StagedChangeSet';

    props.pipeline.addStage({
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