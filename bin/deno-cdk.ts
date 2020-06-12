#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { DenoCdkStack } from "../lib/deno-cdk";

const app = new cdk.App();
new DenoCdkStack(app, "DenoCdkStack");
