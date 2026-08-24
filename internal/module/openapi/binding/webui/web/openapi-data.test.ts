import { describe, expect, it } from "vitest";
import {
  groupedOperations, isOpenAPIDocument, parameterRows, refName, requestBodyRow, responseRows,
  schemaPropertyRows, schemaSummary, type OpenAPIDocument,
} from "./openapi-data";

const fixture: OpenAPIDocument = {
  openapi: "3.0.3",
  info: { title: "fixture API", version: "1.0.0" },
  paths: {
    "/api/v1/iam/session": {
      get: {
        operationId: "iam.session.read",
        tags: ["IAM"],
        parameters: [{ name: "includeArchived", in: "query", schema: { type: "boolean" } }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/SessionResponse" } } } },
        },
      },
    },
    "/api/v1/todos": {
      post: {
        operationId: "todo.create",
        tags: ["Todo"],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateTodoRequest" } } } },
        responses: {
          "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Todo" } } } },
          "400": { description: "Invalid", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/ErrorModel" } } } },
          default: { description: "Error", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/ErrorModel" } } } },
        },
      },
    },
  },
  components: {
    schemas: {
      SessionResponse: {
        type: "object",
        properties: { token: { type: "string" }, expiresAt: { type: "string", format: "date-time" } },
        required: ["token"],
      },
    },
  },
};

describe("openapi-data contract parsing", () => {
  it("recognizes a usable OpenAPI document", () => {
    expect(isOpenAPIDocument(fixture)).toBe(true);
    expect(isOpenAPIDocument(null)).toBe(false);
    expect(isOpenAPIDocument({ openapi: "3.0.3" })).toBe(false);
    expect(isOpenAPIDocument([])).toBe(false);
  });

  it("groups operations by tag preserving document order", () => {
    const groups = groupedOperations(fixture);
    expect(groups.map((group) => group.tag)).toEqual(["IAM", "Todo"]);
    expect(groups[0].operations[0].operationId).toBe("iam.session.read");
    expect(groups[1].operations[0].method).toBe("POST");
    expect(groups[1].operations[0].id).toBe("post-/api/v1/todos");
  });

  it("projects parameter rows with type summaries", () => {
    const [group] = groupedOperations(fixture);
    const rows = parameterRows(group.operations[0]);
    expect(rows).toEqual([{ name: "includeArchived", location: "query", required: false, type: "boolean", description: "" }]);
  });

  it("projects response rows sorted numerically with default last", () => {
    const rows = responseRows(groupedOperations(fixture)[1].operations[0]);
    expect(rows.map((row) => row.status)).toEqual(["201", "400", "default"]);
    expect(rows[0].schema).toBe("ref Todo");
  });

  it("projects the request body summary", () => {
    const body = requestBodyRow(groupedOperations(fixture)[1].operations[0]);
    expect(body).toEqual({ description: "", required: true, schema: "ref CreateTodoRequest" });
    expect(requestBodyRow(groupedOperations(fixture)[0].operations[0])).toBeUndefined();
  });

  it("projects schema property rows with required marks", () => {
    const rows = schemaPropertyRows(fixture.components?.schemas?.SessionResponse);
    expect(rows).toEqual([
      { name: "token", type: "string", required: true, description: "" },
      { name: "expiresAt", type: "string (date-time)", required: false, description: "" },
    ]);
  });

  it("summarizes refs and arrays", () => {
    expect(refName("#/components/schemas/AccountResponse")).toBe("AccountResponse");
    expect(schemaSummary({ type: "array", items: { type: "string" } })).toBe("array<string>");
    expect(schemaSummary(undefined)).toBe("");
    expect(schemaSummary({ $ref: "#/components/schemas/Todo" })).toBe("ref Todo");
  });
});