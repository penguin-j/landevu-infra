import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class LandevuInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, 'LandevuVpc', {
      vpcName: "st-landevu-vpc",
      cidr: "10.0.0.0/16",
      natGateways: 0,
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: "st-landevu-public-subnet",
          subnetType: ec2.SubnetType.PUBLIC
        }
      ]
    })
  }
}
