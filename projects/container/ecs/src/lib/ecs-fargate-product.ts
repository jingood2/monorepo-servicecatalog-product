import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
//import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs/lib/construct';
//import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';

export interface EcsFargateProductProps extends cdk.StackProps {

}

export class EcsFargateProduct extends servicecatalog.ProductStack {
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
              'Environment',
            ],
          },
          {
            Label: {
              default: 'VPC Configuration',
            },
            Parameters: [
              'VpcId',
              'TargetSubnet1',
              'TargetSubnet2',
            ],
          },
          {
            Label: {
              default: 'ELB Configuration',
            },
            Parameters: [
              'ELBListenerArn',
              'ELBSecurityGroupId',
              'TGListenerPort',
              'TGHealthCheckPath',
              'TGHealthCheckPort',
              'PathPattern',
              'HostHeader',
            ],
          },
          {
            Label: {
              default: 'ECS Service Configuration',
            },
            Parameters: [
              'ServiceName',
              //'ContainerSGId',
              'ECRRepoName',
              'ContainerSize',
              'ContainerPort',
              'DesireCount',
              //'ContainerEnv',
              'Priority',
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

    const environment = new cdk.CfnParameter(this, 'Environment', {
      description: 'Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const listenerArn = new cdk.CfnParameter(this, 'ELBListenerArn', {
      description: 'the ARN of ELB Listner',
      type: 'String',
    });

    const elbSgId = new cdk.CfnParameter(this, 'ELBSecurityGroupId', {
      type: 'AWS::EC2::SecurityGroup::Id',
      description: 'SecurityGroupId of ELB',
    });

    const targetSubnet1 = new cdk.CfnParameter(this, 'TargetSubnet1', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'Launch application load balancer into these subnets',
    });

    const targetSubnet2 = new cdk.CfnParameter(this, 'TargetSubnet2', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'Launch application load balancer into these subnets',
    });

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID for ECS Cluster',
    });

    const tgListenerPort = new cdk.CfnParameter(this, 'TGListenerPort', {
      type: 'Number',
      description: 'The port on which the listener listens for requests',
      default: 80,
    });

    const tgHealthCheckPath = new cdk.CfnParameter(this, 'TGHealthCheckPath', {
      type: 'String',
      description: 'Health Check Path for ECS Container',
      default: '/',
    });
    const tgHealthCheckPort = new cdk.CfnParameter(this, 'TGHealthCheckPort', {
      type: 'Number',
      description: 'Health Check Path for ECS Container',
      default: 80,
    });

    const containerSGId = new cdk.CfnParameter(this, 'ContainerSGId', {
      type: 'AWS::EC2::SecurityGroup::Id',
      description: 'Security Id for ECS Container',
    });

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'This will set the Container, Task Definition, and Service name in Fargate',
      default: 'demoapp',
    });

    const ECRRepoName = new cdk.CfnParameter(this, 'ECRRepoName', {
      type: 'String',
      description: 'Name of Amazon Elastic Container Registry',
      default: 'amazon/amazon-ecs-sample',
    });

    const containerSize = new cdk.CfnParameter(this, 'ContainerSize', {
      description: 'Size of container for Fargate task(MB)',
      type: 'Number',
      //default: 'small(1vCPU, 2GB)',
      default: '512',
      allowedValues: ['512', '1024', '2048', '4096', '8192'],
    });

    const containerPort = new cdk.CfnParameter(this, 'ContainerPort', {
      type: 'Number',
      description: 'port number exposed from the container image',
      default: 80,
    });

    const desireCount = new cdk.CfnParameter(this, 'DesireCount', {
      type: 'Number',
      description: 'The desired number of instantiations of the task definition to keep running on the service',
      default: 1,
    });


    const priority = new cdk.CfnParameter(this, 'Priority', {
      type: 'Number',
      description: 'Priority of Listener Rule',
      default: 100,
    });

    const pathPattern = new cdk.CfnParameter(this, 'PathPattern', {
      type: 'CommaDelimitedList',
      description: 'ALB Path Pattern (/, /health)',
      default: '/',
    });

    const hostHeader = new cdk.CfnParameter(this, 'HostHeader', {
      type: 'CommaDelimitedList',
      description: 'ALB Host Header (test.example.com)',
      default: 'test.example.com',
    });

    const elbSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'ELBSG', elbSgId.valueAsString );

    const listener = elbv2.ApplicationListener.fromApplicationListenerAttributes(this, 'listener', {
      listenerArn: cdk.Lazy.string({ produce: () => listenerArn.valueAsString }),
      securityGroup: elbSg,
    });

    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: cdk.Lazy.string( { produce: () => vpcId.valueAsString }),
      availabilityZones: ['ap-northeast-2a', 'ap-northeast-2c'],
      // eslint-disable-next-line max-len
      privateSubnetIds: [cdk.Lazy.string({ produce: () => targetSubnet1.valueAsString }), cdk.Lazy.string( { produce: () => targetSubnet2.valueAsString })],
    });

    // ELB TargetGroup
    const atg = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      //targetGroupName: `${projectName.valueAsString}-ecs-${environment.valueAsString}-${serviceName.valueAsString}-tg`,
      //targetGroupName: `${serviceName.valueAsString}-${environment.valueAsString}-tg`,
      vpc: vpc,
      port: cdk.Lazy.number({ produce: () => tgListenerPort.valueAsNumber }),
      healthCheck: { path: tgHealthCheckPath.valueAsString, port: tgHealthCheckPort.valueAsString },
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    const ecsTaskRole = new iam.Role(this, 'ecs-task-role', {
      roleName: `${serviceName.valueAsString}-ecs-${environment.valueAsString}-task-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const ecsTaskRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'ec2:*',
        'cloudwatch:*',
        'xray:*',
        'logs:*',
        'ssm:*',
        's3:*',
        'sqs:*',
        'sns:*',
      ],
    });

    //taskExecutionRole.addToPolicy(executionRolePolicy);
    ecsTaskRole.addToPrincipalPolicy(ecsTaskRolePolicy);

    const taskExecutionRole = new iam.Role(this, 'ecs-task-execution-role', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    taskExecutionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'));
    taskExecutionRole.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(this, 'ECSTaskExecutionPolicy', 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'));
    taskExecutionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess'));
    taskExecutionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('ElasticLoadBalancingFullAccess'));


    /* const executionRolePolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'elasticloadbalancing:*',
        ],
    });

    //taskExecutionRole.addToPolicy(executionRolePolicy);
    taskExecutionRole.addToPrincipalPolicy(executionRolePolicy);
    */

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      //executionRole: iam.Role.fromRoleName(this, 'ECSTaskExecutionRole', 'ecs-task-execution-role'),
      executionRole: taskExecutionRole,
      //memoryLimitMiB: Number(regionTable.findInMap(containerSize.valueAsString, 'mem')),
      memoryLimitMiB: containerSize.valueAsNumber,
      //taskRole: ecsTaskRoleArn ?? cdk.Aws.NO_VALUE,
      taskRole: ecsTaskRole,
    });

    const container = taskDefinition.addContainer('app', {
      containerName: `${serviceName.valueAsString}`,
      //image: ecs.ContainerImage.fromEcrRepository(ecr.Repository.fromRepositoryName(this, 'ECRRepo', `${ECRRepoName.valueAsString}`), 'latest'),
      image: ecs.ContainerImage.fromRegistry(ECRRepoName.valueAsString),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: new LogGroup(this, 'LogGroup', {
          logGroupName: `${environment.valueAsString}/${serviceName.valueAsString}`,
          retention: 7,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        streamPrefix: 'ecs',
      }),
    });

    // Note: Host port (80) must be left out or equal to container port -1.8881545897088675e+289 for network mode awsvpc
    container.addPortMappings({
      containerPort: containerPort.valueAsNumber,
      //hostPort: 80,
      protocol: ecs.Protocol.TCP,
    });

    const defaultContainerSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'ContainerSG', cdk.Lazy.string( { produce: () => containerSGId.valueAsString }));

    //const defaultContainerSg = ec2.SecurityGroup.fromLookupByName(this, 'DefaultContainerSG', `${projectName.valueAsString}-sg-${environment.valueAsString}-default` , vpc);

    // Note: Unable to determine ARN separator for SSM parameter since the parameter name is an unresolved token. Use "fromAttributes" and specify "simpleName" explicitly
    const namespace = servicediscovery.PublicDnsNamespace.fromPublicDnsNamespaceAttributes(this, 'NameSpace', {
      namespaceName: cdk.Fn.importValue(`${environment.valueAsString}-namespacename`).toString(),
      namespaceId: cdk.Fn.importValue(`${environment.valueAsString}-namespaceid`).toString(), 
      namespaceArn: cdk.Fn.importValue(`${environment.valueAsString}-namespacearn`).toString()
    });

    const cluster = ecs.Cluster.fromClusterAttributes(this, 'ECsCluster', {
      clusterName: `${projectName.valueAsString}-ecs-${environment.valueAsString}`,
      clusterArn: `arn:aws:ecs:${process.env.CDK_DEFAULT_REGION}:${process.env.CDK_DEFAULT_ACCOUNT}:cluster/${projectName.valueAsString}-ecs-${environment.valueAsString}-cluster`,
      vpc: vpc,
      securityGroups: [defaultContainerSg],
      defaultCloudMapNamespace: namespace,
    });

    const serviceSg = new ec2.SecurityGroup(this, 'ECSServiceSg', {
      securityGroupName: `${projectName.valueAsString}-sg-${environment.valueAsString}-${serviceName.valueAsString}`,
      description: `Access to the container ${serviceName.valueAsString} instance`,
      vpc: vpc,
    });


    const svc = new ecs.FargateService(this, 'FargateService', {
      serviceName: `${serviceName.valueAsString}-${environment.valueAsString}`,
      cluster: cluster,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      desiredCount: desireCount.valueAsNumber,
      taskDefinition,
      securityGroups: [defaultContainerSg, serviceSg],
      cloudMapOptions: {
        // Create A records - useful for AWSVPC network mode.
        name: `${serviceName.valueAsString}`,
        dnsRecordType: servicediscovery.DnsRecordType.A,
        cloudMapNamespace: namespace,
      },
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 1,
        },
      ],
    });

    new elbv2.ApplicationListenerRule(this, 'MyApplicationListenerRule', {
      listener: listener,
      priority: priority.valueAsNumber,
      // the properties below are optional
      conditions: [
        elbv2.ListenerCondition.pathPatterns(pathPattern.valueAsList),
        elbv2.ListenerCondition.hostHeaders(hostHeader.valueAsList),
      ],
      //targetGroups: [props.targetGroup],
      targetGroups: [atg],
    });

    atg.addTarget(svc);

  }
}