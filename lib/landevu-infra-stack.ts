import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2"
import { Construct } from "constructs";

export class LandevuInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // VPC
    const landevuVpc = new ec2.Vpc(this, "LandevuVpc", {
      vpcName: "st-landevu-vpc",
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        // Public Subnet
        {
          name: "st-landevu-public-subnet",
          subnetType: ec2.SubnetType.PUBLIC
        }
      ]
    })
    // Security Group for ALB
    const landevuAlbSecurityGroup = new ec2.SecurityGroup(this, "LandevuAlbSg", {
      vpc: landevuVpc,
      securityGroupName: "st-landevu-alb-sg"
    })
    // ALB
    const landevuAlb = new elbv2.ApplicationLoadBalancer(this, "LandevuAlb", {
      vpc: landevuVpc,
      securityGroup: landevuAlbSecurityGroup,
      internetFacing: true,
      loadBalancerName: "st-landevu-alb"
    })
    const landevuListener = landevuAlb.addListener("LandevuListener", {
      port:80,
      open: true
    })
    const landevuTargetGroup = new elbv2.ApplicationTargetGroup(this, "LandevuTargetGroup", {
      vpc: landevuVpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      targetGroupName: "st-landevu-target-group"
    })
  }
}
