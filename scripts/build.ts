import Ajv from "npm:ajv";
import { parse } from "jsr:@std/yaml";
import { ensureDirSync, walkSync } from "jsr:@std/fs";
import { dirname } from "jsr:@std/path";
import { CSS, render } from "jsr:@deno/gfm@0.6";

function compileReadme(content: string): string {
  // Rewrite URLs
  content = content.replace(/\.\/src\//g, "./");
  content = content.replace(/\.yaml/g, ".json");
  const template = Deno.readTextFileSync(
    new URL("../src/index.template.html", import.meta.url),
  );
  const body = render(content);
  const html = template
    .replace("{{CSS}}", CSS)
    .replace("{{BODY}}", body);
  return html;
}

function compileSchema(content: string): string {
  const schema = parse(content);
  // Try compile to check if the schema is valid
  // @ts-ignore: Ajv is a constructor but TS doesn't know it
  const ajv = new Ajv({ strict: true });
  ajv.compile(schema);
  // It seems the schema is valid so output JSON
  return JSON.stringify(schema, null, 2);
}

function main(): void {
  for (const entry of walkSync(new URL("../src", import.meta.url))) {
    if (entry.isFile && entry.name.endsWith(".yaml")) {
      try {
        const content = Deno.readTextFileSync(entry.path);
        const outPath = entry.path
          .replace("src", "dist")
          .replace(".yaml", ".json");
        ensureDirSync(dirname(outPath));
        const json = compileSchema(content);
        Deno.writeTextFileSync(outPath, json);
      } catch (err) {
        throw new Error(`Error compiling ${entry.path}:\n${err}`);
      }
    }
  }
  const readme = Deno.readTextFileSync(
    new URL("../README.md", import.meta.url),
  );
  Deno.writeTextFileSync(
    new URL("../dist/index.html", import.meta.url),
    compileReadme(readme),
  );
}

if (import.meta.main) {
  main();
}
