import * as CDK from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as path from "path";

export class DenoCdkStack extends CDK.Stack {
  constructor(scope: CDK.App, id: string, props?: CDK.StackProps) {
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
    const deno_api_lamb_func = new lambda.Function(this, "NameHandler", {
      functionName: "deno-api-demo",
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, "..", "src", "program")
      ),
      handler: "app.handler",
      layers: [layer],
      runtime: lambda.Runtime.PROVIDED,
      timeout: CDK.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        DENO_UNSTABLE: "--unstable",
      },
    });

    // API Gateway
    // new apigw.LambdaRestApi(this, "deno-api", {
    //   handler: deno_api_lamb_func,
    //   proxy: false,
    // });

    // create the API, need to not rely on CFN's automatic deployment because we need to
    // make our own deployment to set the documentation we create
    const restapi = new apigw.RestApi(this, "deno-api", {
      // deploy: false,
    });

    const integration = new apigw.LambdaIntegration(deno_api_lamb_func);

    // create GET method on /books resource
    const denoApiResource = restapi.root.addResource("api");
    const denoApiMethod = denoApiResource.addMethod("GET", integration, {
      apiKeyRequired: true,
    });

    const denoApiDeployment = new apigw.Deployment(
      this,
      "deno-api-deployment",
      {
        api: restapi,
        description: "new deployment, API Gateway did not make one",
      }
    );

    // // create stage of api with documentation version
    const stage = new apigw.Stage(this, "deno-api-dev", {
      deployment: denoApiDeployment,
      // documentationVersion: doc.documentationVersion,
      stageName: "dev",
    });

    restapi.deploymentStage = stage;

    // Create Api Key
    const key = restapi.addApiKey("ApiKey", {
      apiKeyName: "deno-api-key",
      // value: "MyApiKeyThatIsAtLeast20Characters",
    });

    // Create Use Plan
    const plan = restapi.addUsagePlan("UsagePlan", {
      name: "deno-api-usage-plan",
      apiKey: key,
      throttle: {
        rateLimit: 10,
        burstLimit: 2,
      },
    });

    plan.addApiStage({
      stage: restapi.deploymentStage,
      throttle: [
        {
          method: denoApiMethod,
          throttle: {
            rateLimit: 10,
            burstLimit: 2,
          },
        },
      ],
    });

    // create documentation for GET method
    const docpart = new apigw.CfnDocumentationPart(this, "doc-part1", {
      location: {
        type: "METHOD",
        method: "GET",
        path: denoApiResource.path,
      },
      properties: JSON.stringify({
        status: "successful",
        code: 200,
        message: "Get method was succcessful",
      }),
      restApiId: restapi.restApiId,
    });

    const doc = new apigw.CfnDocumentationVersion(this, "docVersion1", {
      documentationVersion: "version1",
      restApiId: restapi.restApiId,
      description: "this is a test of documentation",
    });

    // not sure if this is necessary but it made sense to me
    doc.addDependsOn(docpart);
  }
}
