import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
  v4,
  bcrypt,
} from "./deps.ts";

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
  uuid: string;
  key: string;
  user: Person;
  message: string;

  constructor(uuid: string, key: string, user: Person, message: string) {
    this.uuid = uuid;
    this.key = key;
    this.user = user;
    this.message = message;
  }
}

const constructResponse = async (event: APIGatewayProxyEvent) => {
  // const name = event.path.replace("/", "");
  const name = "sam.leung";
  const uuid = v4.generate();
  const user = new Person(name);

  const salt = await bcrypt.genSalt(8);
  const key = await bcrypt.hash(uuid, salt);

  const result = new Result(
    uuid,
    key,
    user,
    `Hi ${user.fullName()}, Welcome to deno ${Deno.version.deno} 🦕`
  );

  return result;
};

const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const body = await constructResponse(event);

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/json" },
    body: JSON.stringify(body),
  };
};

export { handler };
