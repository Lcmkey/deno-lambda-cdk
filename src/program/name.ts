import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "https://deno.land/x/lambda/mod.ts";

class Person {
  private _fullName: string;

  constructor(firstName: string) {
    this._fullName = firstName;
  }

  fullName(): string {
    return this._fullName + "!";
  }
}

class Result {
  user: Person;
  message: string;

  constructor(u: Person, m: string) {
    this.message = m;
    this.user = u;
  }
}

const constructResponse = (event: APIGatewayProxyEvent) => {
  const name = event.path.replace("/", "");
  const s = new Person(name);
  const r = new Result(
    s,
    `Hi ${s.fullName()}, Welcome to deno ${Deno.version.deno} 🦕`
  );

  return r;
};

const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/json" },
    body: JSON.stringify(constructResponse(event)),
  };
};

export { handler };
