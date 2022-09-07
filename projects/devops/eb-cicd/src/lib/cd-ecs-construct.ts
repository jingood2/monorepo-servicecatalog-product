//import * as fs from 'fs';
//import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
//import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
//import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs/lib/construct';

//import * as yaml from 'yaml';

export interface CDConstructProps {
  imageTag: string;
  projectName: string;
  environment: string;
  serviceName: string;
  ecrRepoName?: string;
  containerPort: number; // only use beanstalk
  //deployEnvName: string;
  deployTargetType: string;
  approvalStage: string;
  pipeline: codepipeline.Pipeline;
  sourceArtifact: string;
  buildOutput: codepipeline.Artifact;
}

export class CDECSConstruct extends Construct {
  constructor(scope: Construct, id: string, props: CDConstructProps) {
    super(scope, id);

    /* const sourceOutput = new codepipeline.Artifact('Source');
    const buildOutput = new codepipeline.Artifact('Build');


    // CfnConditions
    const isLatestTag = new cdk.CfnCondition(this, 'TargetImageTag', {
      expression: cdk.Fn.conditionEquals(props.imageTag, 'latest'),
    }); */

    const buildOutput = props.buildOutput;

    /*
    const deployBuildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-cd-ecs.yaml'), 'utf8'));

    const deployProject = new codebuild.PipelineProject(this, 'CodeBuildDeployPloject', {
      buildSpec: codebuild.BuildSpec.fromObject(deployBuildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true,
      },
      environmentVariables: {
        //REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        SERVICE_NAME: { value: props.serviceName },
        CONTAINER_PORT: { value: props.containerPort },
        DEPLOY_ENV_NAME: { value: `${props.projectName}-ecs-${props.environment}-cluster` },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        ARTIFACT_BUCKET: { value: props.sourceArtifact },
        IMAGE_TAG: { value: props.imageTag },
        TARGET_TYPE: { value: props.deployTargetType },
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
    })); */

    if (props.approvalStage === 'true') {
      const approvalAction = new codepipeline_actions.ManualApprovalAction({ actionName: 'Approval' });
      props.pipeline.addStage( { stageName: 'Approval', actions: [approvalAction] });
    }

    /* const deployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Deploy',
      input: props.buildOutput,
      project: deployProject,
    }); */

    const clusterName = `${props.projectName}-ecs-${props.environment}-cluster`;
    const serviceName = `${props.serviceName}-${props.environment}`;

    const service = ecs.BaseService.fromServiceArnWithCluster(this, 'EcsService',
      `arn:aws:ecs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:service/${clusterName}/${serviceName}`,
    );


    const deployAction = new codepipeline_actions.EcsDeployAction({
      actionName: 'DeployAction',
      service,
      // if your file is called imagedefinitions.json,
      // use the `input` property,
      // and leave out the `imageFile` property
      input: buildOutput,
      // if your file name is _not_ imagedefinitions.json,
      // use the `imageFile` property,
      // and leave out the `input` property
      //imageFile: buildOutput.atPath('imageDef.json'),
      deploymentTimeout: cdk.Duration.minutes(60), // optional, default is 60 minutes
    });

    props.pipeline.addStage( { stageName: 'Deploy', actions: [deployAction] });


  }
}