import { Aws, CfnMapping, CfnParameter, Fn, RemovalPolicy, StackProps, CfnCondition } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ProductStack } from 'aws-cdk-lib/aws-servicecatalog';
//import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface VpcStackProps extends StackProps {

}

export class VpcProduct extends ProductStack {
  constructor(scope: Construct, id: string, _props: VpcStackProps) {
    super(scope, id);

    const projectName = new CfnParameter(this, 'ProjectName', {
      type: 'String',
      default: 'acme',
      description: 'Project Name',
    });

    const environmentType = new CfnParameter(this, 'EnvironmentType', {
      type: 'String',
      default: 'dev',
      description: 'Environment Type',
      allowedValues: ['dev', 'stage', 'prod', 'shared'],
    });

    const vpcCidr = new CfnParameter(this, 'CidrBlock', {
      type: 'String',
      default: '10.0.0.0/16',
      description: 'CIDR Block for VPC. Must be /26 or larger CIDR block.',
      allowedPattern: '^(?:[0-9]{1,3}.){3}[0-9]{1,3}[/]([0-9]?[0-6]?|[1][7-9])$',
    });

    const createSingleNatGateway = new CfnParameter(this, 'CreateSingleNAT', {
      type: 'String',
      description: 'Single NAT Gateway in 1st public subnet or NAT Gateway in each public subnet',
      default: 'true',
      allowedValues: ['true', 'false'],
    });

    const createSingleNatCondition = new CfnCondition(this, 'CreateSingleNatCondition', {
      expression: Fn.conditionEquals(createSingleNatGateway, 'true'),
    });

    const createTwoNatCondition = new CfnCondition(this, 'CreateTwoNatCondition', {
      expression: Fn.conditionEquals(createSingleNatGateway, 'false'),
    });

    /**
     * Mappings - define fixed values
     */
    const mappings = new CfnMapping(this, 'SolutionMapping');
    mappings.setValue('Version', 'Latest', 'latest');
    mappings.setValue('Route', 'QuadZero', '0.0.0.0/0');

    // define resources here...
    const vpc = new ec2.CfnVPC(this, 'VPC', {
      cidrBlock: vpcCidr.valueAsString,
    });

    vpc.applyRemovalPolicy(RemovalPolicy.RETAIN);
    vpc.tags.setTag('Name', `${projectName.valueAsString}-${environmentType.valueAsString}-vpc`);

    const cidrCount = 4;
    const cidrBits = '4';
    const availabilityZoneA = {
      'Fn::Select': [
        '0',
        {
          'Fn::GetAZs': '',
        },
      ],
    };
    const availabilityZoneC = {
      'Fn::Select': [
        '2',
        {
          'Fn::GetAZs': '',
        },
      ],
    };

    // Public Subnet
    const publicSubnet1 = new ec2.CfnSubnet(this, 'PublicSubnet1', {
      vpcId: vpc.ref,
      mapPublicIpOnLaunch: true,
      cidrBlock: Fn.select(0, Fn.cidr(vpc.attrCidrBlock, cidrCount, cidrBits)),
    });
    publicSubnet1.tags.setTag('Name', `${Aws.STACK_NAME}-PublicSubnet1`);
    publicSubnet1.applyRemovalPolicy(RemovalPolicy.RETAIN);
    publicSubnet1.addPropertyOverride('AvailabilityZone', availabilityZoneA);

    const publicSubnet2 = new ec2.CfnSubnet(this, 'PublicSubnet2', {
      vpcId: vpc.ref,
      mapPublicIpOnLaunch: true,
      cidrBlock: Fn.select(1, Fn.cidr(vpc.attrCidrBlock, cidrCount, cidrBits)),
    });
    publicSubnet1.tags.setTag('Name', `${Aws.STACK_NAME}-PublicSubnet2`);
    publicSubnet1.applyRemovalPolicy(RemovalPolicy.RETAIN);
    publicSubnet1.addPropertyOverride('AvailabilityZone', availabilityZoneC);

    //NAT Subnet Route Tables.
    const natSubnetRouteTable = new ec2.CfnRouteTable(this, 'PubSubnetRouteTable', {
      vpcId: vpc.ref,
    });
    natSubnetRouteTable.tags.setTag('Name', `${Aws.STACK_NAME}-PubSubnetRouteTable`);
    natSubnetRouteTable.applyRemovalPolicy(RemovalPolicy.RETAIN);

    // Create Internet Gateway
    const cfnInternetGateway = new ec2.CfnInternetGateway(
      this,
      'MyCfnInternetGateway',
      /* all optional props */ {
        tags: [
          {
            key: 'Name',
            value: `${Aws.STACK_NAME}-igw`,
          },
        ],
      },
    );

    new ec2.CfnRoute(this, 'PubSubnetRoute', {
      routeTableId: natSubnetRouteTable.ref,
      destinationCidrBlock: mappings.findInMap('Route', 'QuadZero'),
      gatewayId: cfnInternetGateway.ref,
    });

    //Subnet Route Table Associations.
    const natSubnet1RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'PubSubnet1RouteTableAssociation', {
      subnetId: publicSubnet1.ref,
      routeTableId: natSubnetRouteTable.ref,
    });
    natSubnet1RouteTableAssociation.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const natSubnet2RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'PubSubnet2RouteTableAssociation', {
      subnetId: publicSubnet2.ref,
      routeTableId: natSubnetRouteTable.ref,
    });
    natSubnet2RouteTableAssociation.applyRemovalPolicy(RemovalPolicy.RETAIN);

    // Create EIP1
    const cfnEIP1 = new ec2.CfnEIP(this, 'NAT1EIP', {
      domain: 'vpc',
      tags: [
        {
          key: 'Name',
          value: `${Aws.STACK_NAME}-eip-01`,
        },
      ],
    });

    // Create NATGateway1
    const cfnNGW1 = new ec2.CfnNatGateway(this, 'NAT1Gateway', {
      subnetId: publicSubnet1.ref,
      allocationId: Fn.getAtt(cfnEIP1.ref, 'AllocationId').toString(),
      tags: [
        {
          key: 'Name',
          value: `${Aws.STACK_NAME}-ngw-01`,
        },
      ],
    });

    // Create EIP1
    const cfnEIP2 = new ec2.CfnEIP(this, 'NAT2EIP', {
      domain: 'vpc',
      tags: [
        {
          key: 'Name',
          value: `${Aws.STACK_NAME}-eip-02`,
        },
      ],
    });
    cfnEIP2.cfnOptions.condition = createTwoNatCondition;

    // Create NATGateway1
    const cfnNGW2 = new ec2.CfnNatGateway(this, 'NAT2Gateway', {
      subnetId: publicSubnet2.ref,
      allocationId: Fn.getAtt(cfnEIP2.ref, 'AllocationId').toString(),
      tags: [
        {
          key: 'Name',
          value: `${Aws.STACK_NAME}-ngw-02`,
        },
      ],
    });
    cfnNGW2.cfnOptions.condition = createTwoNatCondition;

    // Create Firewall Subnet 1
    const privateSubnet1 = new ec2.CfnSubnet(this, 'PrivateSubnet1', {
      vpcId: vpc.ref,
      cidrBlock: Fn.select(2, Fn.cidr(vpc.attrCidrBlock, cidrCount, cidrBits)),
    });

    privateSubnet1.tags.setTag('Name', `${Aws.STACK_NAME}-PrivateSubnet1`);
    privateSubnet1.applyRemovalPolicy(RemovalPolicy.RETAIN);
    privateSubnet1.addPropertyOverride('AvailabilityZone', availabilityZoneA);

    const privateSubnetRouteTable1 = new ec2.CfnRouteTable(this, 'PrivateSubnet1RouteTable', {
      vpcId: vpc.ref,
    });
    privateSubnetRouteTable1.tags.setTag('Name', `${Aws.STACK_NAME}-fw-subnet1-rt`);
    privateSubnetRouteTable1.applyRemovalPolicy(RemovalPolicy.RETAIN);

    new ec2.CfnRoute(this, 'PrivateSubnet1RouteNGW', {
      routeTableId: privateSubnetRouteTable1.ref,
      destinationCidrBlock: mappings.findInMap('Route', 'QuadZero'),
      natGatewayId: cfnNGW1.ref,
    });

    //Subnet Route Table Associations.
    const privateSubnet1RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'privateSubnet1RouteTableAssociation', {
      subnetId: privateSubnet1.ref,
      routeTableId: privateSubnetRouteTable1.ref,
    });
    privateSubnet1RouteTableAssociation.applyRemovalPolicy(RemovalPolicy.RETAIN);

    // Create Firewall Subnet 2
    const privateSubnet2 = new ec2.CfnSubnet(this, 'PrivateSubnet2', {
      vpcId: vpc.ref,
      cidrBlock: Fn.select(3, Fn.cidr(vpc.attrCidrBlock, cidrCount, cidrBits)),
    });

    privateSubnet2.tags.setTag('Name', `${Aws.STACK_NAME}-PrivateSubnet2`);
    privateSubnet2.applyRemovalPolicy(RemovalPolicy.RETAIN);
    privateSubnet2.addPropertyOverride('AvailabilityZone', availabilityZoneC);

    const privateSubnetRouteTable2 = new ec2.CfnRouteTable(this, 'PrivateSubnet2RouteTable', {
      vpcId: vpc.ref,
    });
    privateSubnetRouteTable2.tags.setTag('Name', `${Aws.STACK_NAME}-fw-subnet2-rt`);
    privateSubnetRouteTable2.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const cfnRouteTwo = new ec2.CfnRoute(this, 'PrivateSubnet2RouteNGWTwo', {
      routeTableId: privateSubnetRouteTable2.ref,
      destinationCidrBlock: mappings.findInMap('Route', 'QuadZero'),
      natGatewayId: cfnNGW2.ref,
    });
    cfnRouteTwo.cfnOptions.condition = createTwoNatCondition ;

    const cfnRouteOne = new ec2.CfnRoute(this, 'PrivateSubnet2RouteNGWOne', {
      routeTableId: privateSubnetRouteTable2.ref,
      destinationCidrBlock: mappings.findInMap('Route', 'QuadZero'),
      natGatewayId: cfnNGW1.ref,
    });
    cfnRouteOne.cfnOptions.condition = createSingleNatCondition ;

    //Subnet Route Table Associations.
    const privateSubnet2RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'privateSubnet2RouteTableAssociation', {
      subnetId: privateSubnet2.ref,
      routeTableId: privateSubnetRouteTable2.ref,
    });
    privateSubnet2RouteTableAssociation.applyRemovalPolicy(RemovalPolicy.RETAIN);
  }
}