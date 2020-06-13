import * as CDK from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as assets from "@aws-cdk/assets";
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
    const denoApiLambFunc = new lambda.Function(this, "NameHandler", {
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
    const restApi = new apigw.RestApi(this, "deno-api", {
      restApiName: "deno-api",
      // deploy: true,
    });

    const integration = new apigw.LambdaIntegration(denoApiLambFunc);

    // We define the JSON Schema for the transformed valid request body
    const requestBodyValidationModel = restApi.addModel(
      "RequestBodyValidationModel",
      {
        contentType: "application/json",
        modelName: "bodyValidation",
        schema: {
          title: "request body validation",
          type: apigw.JsonSchemaType.ARRAY,
          minItems: 1,
          definitions: {
            DataType: {
              type: apigw.JsonSchemaType.OBJECT,
              required: ["photoUrl", "text", "type"],
              properties: {
                photoUrl: {
                  type: apigw.JsonSchemaType.STRING,
                },
                text: {
                  description: apigw.JsonSchemaType.STRING,
                  type: apigw.JsonSchemaType.STRING,
                },
                type: {
                  enum: ["text", "image"],
                  type: apigw.JsonSchemaType.STRING,
                },
              },
            },
            Content: {
              type: apigw.JsonSchemaType.OBJECT,
              required: ["content"],
              properties: {
                content: {
                  ref: "#/definitions/DataType",
                },
              },
            },
          },
          items: { ref: "#/definitions/Content" },
        },
      }
    );

    // define validator for request parameter mappings
    const validator = restApi.addRequestValidator("DefaultValidator", {
      requestValidatorName: "validate body",
      validateRequestBody: true,
      // validateRequestParameters: true,
    });

    // Create resouce
    const denoApiResource = restApi.root.addResource("api");

    // create POST method on to resource
    const denoApiPostMethod = denoApiResource.addMethod("POST", integration, {
      apiKeyRequired: true,
      requestValidator: validator,
      requestModels: { "application/json": requestBodyValidationModel },
    });
    const denoApiGetMethod = denoApiResource.addMethod("GET", integration, {
      apiKeyRequired: true,
    });

    // Create Deployment
    const denoApiDeployment = restApi.latestDeployment ? restApi.latestDeployment : new apigw.Deployment(
      this,
      "deno-api-deployment",
      {
        api: restApi,
        description: "new deployment, API Gateway did not make one",
      }
    );

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
      restApiId: restApi.restApiId,
    });

    // const doc = new apigw.CfnDocumentationVersion(this, "docVersion1", {
    //   documentationVersion: "version1",
    //   restApiId: restApi.restApiId,
    //   description: "this is a test of documentation",
    // });

    // // not sure if this is necessary but it made sense to me
    // doc.addDependsOn(docpart);

    // // create stage of api with documentation version
    const stage = new apigw.Stage(this, "deno-api-dev", {
      deployment: denoApiDeployment,
      // documentationVersion: doc.documentationVersion,
      stageName: "dev",
    });

    // Assign Stage to api
    restApi.deploymentStage = stage;

    // Create Api Key
    const key = restApi.addApiKey("ApiKey", {
      apiKeyName: "deno-api-key",
      // value: "MyApiKeyThatIsAtLeast20Characters",
    });

    // Create Use Plan
    const plan = restApi.addUsagePlan("UsagePlan", {
      name: "deno-api-usage-plan",
      apiKey: key,
      throttle: {
        rateLimit: 10,
        burstLimit: 2,
      },
    });

    plan.addApiStage({
      stage: restApi.deploymentStage,
      throttle: [
        {
          method: denoApiGetMethod,
          throttle: {
            rateLimit: 10,
            burstLimit: 2,
          },
        },
        {
          method: denoApiPostMethod,
          throttle: {
            rateLimit: 10,
            burstLimit: 2,
          },
        },
      ],
    });

    // set rate limited api key
    // const rateLimitedApiKey = new apigw.RateLimitedApiKey(
    //   this,
    //   "rate-limited-api-key",
    //   {
    //     customerId: "hello-customer",
    //     resources: [restApi],
    //     quota: {
    //       limit: 10000,
    //       period: apigw.Period.MONTH,
    //     },
    //   }
    // );
  }
}
