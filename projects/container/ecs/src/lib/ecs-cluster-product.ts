import * as cdk from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs/lib/construct';
//import { Ec2Service } from 'aws-cdk-lib/aws-ecs';
//import { AmiHardwareType } from 'aws-cdk-lib/aws-ecs';

export interface ECSClusterProductProps {
  ecsOptiImage: ecs.EcsOptimizedImage;
}


export class ECSClusterProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: ECSClusterProductProps) {
    super(scope, id);

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

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID for ECS Cluster',
    });

    const ec2Subnet1 = new cdk.CfnParameter(this, 'Subnet1', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'EC2 subnet 1',
    });

    const ec2Subnet2 = new cdk.CfnParameter(this, 'Subnet2', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'EC2 subnet 2',
    });

    const availableZones = new cdk.CfnParameter(this, 'AvailibilityZones', {
      type: 'List<AWS::EC2::AvailabilityZone::Name>',
      description: 'VPC Availability Zone List',
    });

    /* const cloudmapNamespace = new cdk.CfnParameter(this, 'LocalDomain', {
        type: 'string',
        default: 'dev.internal',
        description: 'CloudMap Private DNS',
    }); */

    const instanceType = new cdk.CfnParameter(this, 'InstacneType', {
      type: 'String',
      default: 't3.micro',
      allowedValues: [
        't2.nano', 't2.micro', 't2.small', 't2.medium', 't2.large', 't2.xlarge', 't2.2xlarge',
        't3.nano', 't3.micro', 't3.small', 't3.medium', 't3.large', 't3.xlarge', 't3.2xlarge',
        'm5.large', 'm5.xlarge', 'm5.2xlarge', 'm5.4xlarge',
        'm5a.large', 'm5a.xlarge', 'm5a.2xlarge', 'm5a.4xlarge',
        'c5.large', 'c5.xlarge', 'c5.2xlarge', 'c5.4xlarge',
        'r5.large', 'r5.xlarge', 'r5.2xlarge', 'r5.4xlarge',
      ],
    });

    const minCapacity = new cdk.CfnParameter(this, 'MinCapacity', {
      type: 'Number',
      default: 0,
      description: 'Min Capacity',
    });

    const maxCapacity = new cdk.CfnParameter(this, 'MaxCapacity', {
      type: 'Number',
      default: 2,
      description: 'Max Capacity',
    });

    const desiredCapacity = new cdk.CfnParameter(this, 'DesiredCapacity', {
      type: 'Number',
      default: 0,
      description: 'Desired Capacity',
    });

    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: cdk.Lazy.string( { produce: () => vpcId.valueAsString }),
      availabilityZones: availableZones.valueAsList,
    });

    const cluster = new ecs.Cluster(this, 'ECSCluster', {
      clusterName: `${projectName.valueAsString}-ecs-${environment.valueAsString}`,
      vpc: vpc,
      enableFargateCapacityProviders: true,
      //defaultCloudMapNamespace: { name: 'svc.local', type: NamespaceType.DNS_PRIVATE, vpc: vpc },
    });

    const dnsNamespace = cluster.addDefaultCloudMapNamespace({
      vpc,
      //name: cdk.Lazy.string( { produce: () => cloudmapNamespace.valueAsString }),
      name: `${environment.valueAsString}.internal`,
      type: servicediscovery.NamespaceType.DNS_PRIVATE,
    });

    // Create ContainerSecurityGroup and Role
    const ecsDefaultSecurityGroup = new ec2.SecurityGroup(this, 'ECSDefaultSG', {
      securityGroupName: `${projectName.valueAsString}-sg-${environment.valueAsString}-default`,
      description: 'Default Security Group for Access to the container instance',
      vpc,
    });

    const autoscalingRole = new iam.Role(this, 'AutoscalingRole', {
      assumedBy: new iam.ServicePrincipal('application-autoscaling.amazonaws.com'),
    });

    autoscalingRole.addToPolicy(new iam.PolicyStatement({
      sid: 'serviceautoscaling',
      resources: ['*'],
      actions: [
        'application-autoscaling:*',
        'cloudwatch:DescribeAlarms',
        'cloudwatch:PutMetricAlarm',
        'ecs:DescribeServices',
        'ecs:UpdateService',
        'ec2:*',
        'xray:*',
        'cloudwatch:*',
        'xray:*',
        'logs:*',
        'ssm:*',
        's3:*',
        'sqs:*',
        'sns:*',
      ],
    }));


    const defaultAsg = new autoscaling.AutoScalingGroup(this, 'ASG', {
      vpc,
      instanceType: new ec2.InstanceType(instanceType.valueAsString),
      // If task draining is enabled, ECS will transparently reschedule tasks on to the new instances before terminating your old instances. If you have disabled task draining, the tasks will be terminated along with the instance
      // To prevent that, you can pick a non-updating AMI by passing cacheInContext: true,
      //machineImage: ecs.EcsOptimizedImage.amazonLinux2(  AmiHardwareType.STANDARD, {  cachedInContext: true }),
      //machineImage: ec2.MachineImage.fromSsmParameter('/aws/service/ecs/optimized-ami/amazon-linux-2/recommended'),
      machineImage: ec2.MachineImage.genericLinux({ 'ap-northeast-2': 'ami-0d15c49f8a42016ec' }),
      //machineImage: _props.ecsOptiImage,
      desiredCapacity: desiredCapacity.valueAsNumber,
      minCapacity: minCapacity.valueAsNumber,
      maxCapacity: maxCapacity.valueAsNumber,
      // ... other options here ...
      vpcSubnets: {
        subnets: [
          ec2.Subnet.fromSubnetId(this, 'ASGNoneSubnetA', ec2Subnet1.valueAsString),
          ec2.Subnet.fromSubnetId(this, 'ASGNoneSubnetC', ec2Subnet2.valueAsString),
        ],
      },
      securityGroup: ecsDefaultSecurityGroup,
    });

    /* const asgNone = new autoscaling.AutoScalingGroup(this, 'ASGWithNoEBS', {
        autoScalingGroupName: `${projectName.valueAsString}-${environmentType.valueAsString}-${ec2Name.valueAsString}-asg`,
        instanceType: new ec2.InstanceType(instanceType.valueAsString),
        machineImage: ec2.MachineImage.latestAmazonLinux({
          generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        }),
        vpc,
        role: ec2Role,
        minCapacity: ec2AutoscaleMinSize.valueAsNumber,
        maxCapacity: ec2AutoscaleMaxSize.valueAsNumber,
        desiredCapacity: ec2AutoscaleDesiredCapacity.valueAsNumber,
        vpcSubnets: {
          subnets: [
            ec2.Subnet.fromSubnetId(this, 'ASGNoneSubnetA', ec2Subnet1.valueAsString),
            ec2.Subnet.fromSubnetId(this, 'ASGNoneSubnetC', ec2Subnet2.valueAsString),
          ],
        },
        securityGroup: ec2SecurityGroup,
      }); */


    const capacityProvider = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', {
      capacityProviderName: `${projectName.valueAsString}-ecs-${environment.valueAsString}-capacity-provider`,
      autoScalingGroup: defaultAsg,
    });
    cluster.addAsgCapacityProvider(capacityProvider);

    new ssm.StringParameter(this, 'NamespaceId', {
      parameterName: 'namespaceId',
      stringValue: dnsNamespace.namespaceId,
      simpleName: true,
    });
    new ssm.StringParameter(this, 'NamespaceArn', {
      parameterName: 'namespaceArn',
      //stringValue: `arn:aws:servicediscovery:ap-northeast-2:037729278610:namespace/ns-5b2c7dzqwccz47ey`,
      stringValue: dnsNamespace.namespaceArn,
      simpleName: true,
    });
    new ssm.StringParameter(this, 'NamespaceName', {
      parameterName: 'namespaceName',
      stringValue: dnsNamespace.namespaceName,
      simpleName: true,
    });

    // CDK Output
    new cdk.CfnOutput(this, 'ClusterName', {
      description: 'The name of the ECS cluster',
      value: cluster.clusterArn,
      exportName: `${id}:${environment.valueAsString}:ClusterName`,
    });

    new cdk.CfnOutput(this, 'ContainerSecurityGroupId', {
      value: ecsDefaultSecurityGroup.securityGroupId,
      description: 'A security group used to allow Fargate containers to receive traffic',
      exportName: `${id}:${environment.valueAsString}:ContainerSecurityGroup`,
    });

    new cdk.CfnOutput(this, 'NamespaceIDOutput', {
      description: 'Namespace Id',
      value: dnsNamespace.namespaceId,
    });

    new cdk.CfnOutput(this, 'NamespaceArnOutput', {
      description: 'Namespace Arn',
      value: dnsNamespace.namespaceArn,
    });

    new cdk.CfnOutput(this, 'NamespaceNameOutput', {
      description: 'Namespace name',
      value: dnsNamespace.namespaceName,
    });
  }
}