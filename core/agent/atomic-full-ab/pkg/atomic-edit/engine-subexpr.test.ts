import { describe, expect, it } from "vitest";
import { Project } from "ts-morph";
import { resolveSubExpression } from "./symbols.js";

function makeSourceFile(code: string) {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true, noEmit: true },
  });
  return project.createSourceFile("test.ts", code, { overwrite: true });
}

describe("resolveSubExpression", () => {
  it("resolves a parameter inside a function", () => {
    const sf = makeSourceFile(`
function login(user: string, password: string): boolean {
  return user === "admin" && password === "123";
}
`);
    const result = resolveSubExpression(sf, "login.user");
    expect(result.selector).toBe("login.user");
    expect(result.kind).toBe("Parameter");
  });

  it("resolves a variable inside a function body", () => {
    const sf = makeSourceFile(`
function process(data: number[]): number {
  const result = data.reduce((a, b) => a + b, 0);
  return result;
}
`);
    const result = resolveSubExpression(sf, "process.result");
    expect(result.selector).toBe("process.result");
    expect(result.kind).toBe("VariableDeclaration");
  });

  it("resolves a variable inside a class method", () => {
    const sf = makeSourceFile(`
class UserService {
  private db: Database;
  async findById(id: string): Promise<User> {
    const user = await this.db.query("SELECT * FROM users WHERE id = ?", [id]);
    return user;
  }
}
`);
    const result = resolveSubExpression(sf, "UserService.findById.user");
    expect(result.selector).toBe("UserService.findById.user");
    expect(result.kind).toBe("VariableDeclaration");
  });

  it("resolves a property inside a class", () => {
    const sf = makeSourceFile(`
class Config {
  public apiKey: string = "default";
  public timeout: number = 5000;
}
`);
    const result = resolveSubExpression(sf, "Config.apiKey");
    expect(result.selector).toBe("Config.apiKey");
    expect(result.kind).toBe("PropertyDeclaration");
  });

  it("resolves a nested method-local variable", () => {
    const sf = makeSourceFile(`
class AuthModule {
  private token: string = "";
  login(credentials: Credentials): string {
    const result = this.validate(credentials);
    return result;
  }
}
`);
    const result = resolveSubExpression(sf, "AuthModule.login.result");
    expect(result.selector).toBe("AuthModule.login.result");
    expect(result.kind).toBe("VariableDeclaration");
  });

  it("throws on a missing inner expression", () => {
    const sf = makeSourceFile(`function foo(a: number): number { return a * 2; }`);
    expect(() => resolveSubExpression(sf, "foo.nonexistent")).toThrow(/no "nonexistent" found/);
  });

  it("throws on a missing container", () => {
    const sf = makeSourceFile(`const x = 1;`);
    expect(() => resolveSubExpression(sf, "missing.y")).toThrow(/no symbol matches/);
  });

  it("throws on a single-part selector", () => {
    const sf = makeSourceFile(`function foo() {}`);
    expect(() => resolveSubExpression(sf, "foo")).toThrow(/requires container.expr/);
  });
});
