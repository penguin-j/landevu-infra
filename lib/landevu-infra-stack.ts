import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2"
import * as ecr from "aws-cdk-lib/aws-ecr"
import * as ecs from "aws-cdk-lib/aws-ecs"
import * as ssm from "aws-cdk-lib/aws-ssm"
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager"
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
    landevuAlbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80))
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
      port: 8080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      targetGroupName: "st-landevu-target-group"
    })
    landevuTargetGroup.configureHealthCheck({
      path: "/v1/healthcheck"
    })
    landevuListener.addTargetGroups("LandevuTargetGroup", {
      targetGroups: [landevuTargetGroup]
    })

    // ECR
    const ECR_REPOSITORY_NAME = "landevu-api/st"

    // ECS cluster
    const landevuCluster = new ecs.Cluster(this, "LandevuCluster", {
      vpc: landevuVpc,
      clusterName: "st-landevu-cluster"
    })

    // ECS task definition
    const landevuTaskDefinition = new ecs.FargateTaskDefinition(this, "LandevuTaskDefinition", {
    })

    const landevuContainer = landevuTaskDefinition.addContainer("LandevuContainer", {
      image:ecs.ContainerImage.fromEcrRepository(ecr.Repository.fromRepositoryName(this, "fromRepositoryName", ECR_REPOSITORY_NAME), "latest"),
      memoryLimitMiB: 256,
      cpu: 256,
      logging: ecs.LogDriver.awsLogs(
        {
          streamPrefix: "st-landevu-api"
        }
      ),
      environment: {
        "SPRING_DATASOURCE_URL": ssm.StringParameter.valueForStringParameter(this, "/st/landevu/db/url"),
        "SPRING_DATASOURCE_USERNAME": ssm.StringParameter.valueForStringParameter(this, "/st/landevu/db/username"),
        "SPRING_DATASOURCE_PASSWORD": secretsmanager.Secret.fromSecretNameV2(this, "dbPassword", "/st/landevu/db/password").toString()
      }
    })

    landevuContainer.addPortMappings({
      hostPort: 8080,
      containerPort: 8080,
      protocol: ecs.Protocol.TCP
    })

    // Security Group for App
    const landevuAppSecurityGroup = new ec2.SecurityGroup(this, "LandevuAppSg", {
      vpc: landevuVpc,
      securityGroupName: "st-landevu-app-sg"
    })
    landevuAppSecurityGroup.addIngressRule(landevuAlbSecurityGroup, ec2.Port.tcp(8080))
  }
}
