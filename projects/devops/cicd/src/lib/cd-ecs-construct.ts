import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs/lib/construct';

import * as yaml from 'yaml';

export interface CDConstructProps {
  imageTag: string;
  pipeline: codepipeline.Pipeline;
  ecrRepoName?: string;
  serviceName: string;
  containerPort: number; // only use beanstalk
  deployEnvName: string;
  deployTargetType: string;
  Environment: string;

  approvalStage: string;

  buildOutput: codepipeline.Artifact;
}

export class CDConstruct extends Construct {
  constructor(scope: Construct, id: string, props: CDConstructProps) {
    super(scope, id);

    /* const sourceOutput = new codepipeline.Artifact('Source');
    const buildOutput = new codepipeline.Artifact('Build');


    // CfnConditions
    const isLatestTag = new cdk.CfnCondition(this, 'TargetImageTag', {
      expression: cdk.Fn.conditionEquals(props.imageTag, 'latest'),
    }); */

    const service =  ecs.FargateService.fromFargateServiceArn(this, 'FargateService', 'FargateServiceArn');




    const deployBuildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec-cd.yaml'), 'utf8'));

    const deployProject = new codebuild.PipelineProject(this, 'CodeBuildDeployPloject', {
      buildSpec: codebuild.BuildSpec.fromObject(deployBuildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true,
      },
      environmentVariables: {
        //REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        SERVICE_NAME: { value: props.serviceName },
        //CONTAINER_PORT: { value: CONTAINER_PORT.valueAsNumber },
        DEPLOY_ENV_NAME: { value: props.deployEnvName },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        ARTIFACT_BUCKET: { value: `${props.serviceName}-codepipeline-artifact` },
        IMAGE_TAG: { value: props.imageTag },
        //S3_KEY: { value: objKey },
        //TARGET_TYPE: { value: TARGET_TYPE.valueAsString },
        TARGET_TYPE: { value: props.deployTargetType },
        //AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        //AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
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
        'cloudformation:*'],
    }));

    if (props.approvalStage === 'true') {
      const approvalAction = new codepipeline_actions.ManualApprovalAction({ actionName: 'Approval' });
      props.pipeline.addStage( { stageName: 'Approval', actions: [approvalAction] });
    }

    const deployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Deploy',
      input: props.buildOutput,
      project: deployProject,
    });
    props.pipeline.addStage( { stageName: 'Deploy', actions: [deployAction] });


  }
}