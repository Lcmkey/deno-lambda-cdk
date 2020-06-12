import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as path from "path";

export class DenoCdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the Deno layer
    const layer = new lambda.LayerVersion(this, "deno-layer", {
      layerVersionName: "deno-api-layer-demo",
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, "..", "src", "layer")
      ),
      compatibleRuntimes: [lambda.Runtime.PROVIDED],
      license: "Apache-2.0",
      description: "A layer that enebales Deno to run in lambda",
    });

    // Define Lambda func
    const name = new lambda.Function(this, "NameHandler", {
      functionName: "deno-api-demo",
      runtime: lambda.Runtime.PROVIDED,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, "..", "src", "program")
      ),
      handler: "name.handler",
      layers: [layer],
    });

    // API Gateway
    new apigw.LambdaRestApi(this, "Endpoint", {
      handler: name,
    });
  }
}
