export async function handler(event, context) {
    return {
        statusCode: 200,
        headers: { "content-type": "text/html;charset=utf8" },
        body: `Welcome to deno ${Deno.version.deno} 🦕`,
    };
}
//# sourceMappingURL=file:///src/runtime/.deno_dir/gen/file/src/runtime/hello.ts.js.map