import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs/lib/construct';

export interface ECSClusterProductProps {

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


    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
        vpcId: cdk.Lazy.string( { produce: () => vpcId.valueAsString }),
        availabilityZones: ['ap-northeast-2a', 'ap-northeast-2c'],
    });

    const ecsCluster = new ecs.Cluster(this, 'ECSCluster', {
        clusterName: `${projectName.valueAsString}-${environment.valueAsString}-ecs-cluster`,
        vpc: vpc,
    });


    new cdk.CfnOutput(this, 'ClusterName', {
        description: 'The name of the ECS cluster',
        value: ecsCluster.clusterArn,
        exportName: `${id}:${environment.valueAsString}:ClusterName`,
    });


    
  }
}