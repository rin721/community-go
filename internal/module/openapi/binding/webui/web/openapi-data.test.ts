import { describe, expect, it } from "vitest";
import {
  bodyTypeOptions, buildApiTree, buildRequest, executionParameters, filterApiTree, filterOperationGroups, formFieldRows,
  groupedOperations, hasSecurityScheme, isMutation, isOpenAPIDocument, parameterDefaultValue, requestBodySchema,
  responseRows, sampleJSON, schemaPropertyRows, schemaSummary, treeNodeCount, type OpenAPIDocument,
} from "./openapi-data";

const fixture: OpenAPIDocument = {
  openapi: "3.0.3",
  info: { title: "fixture API", version: "1.0.0" },
  paths: {
    "/api/v1/iam/session": {
      get: {
        operationId: "iam.session.read",
        tags: ["IAM"],
        security: [{ webuiSession: [] }],
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
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateTodoRequest" } } } },
        responses: {
          "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Todo" } } } },
          default: { description: "Error", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/ErrorModel" } } } },
        },
      },
    },
    "/api/v1/todos/{id}/complete": {
      patch: {
        operationId: "todo.complete",
        tags: ["Todo"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/v1/navigation/menus/{id}": {
      put: {
        operationId: "navigation.menus.update",
        tags: ["Navigation"],
        security: [{ webuiSession: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
    },
  },
  components: {
    schemas: {
      SessionResponse: {
        type: "object",
        properties: { token: { type: "string" }, expiresAt: { type: "string", format: "date-time" }, active: { type: "boolean" } },
        required: ["token"],
      },
      CreateTodoRequest: {
        type: "object",
        properties: { title: { type: "string" }, tags: { type: "array", items: { type: "string" } }, flagged: { type: "boolean" } },
        required: ["title"],
      },
      ErrorModel: { type: "object", properties: { code: { type: "string" } } },
      Todo: { type: "object", properties: { id: { type: "string" } } },
    },
  },
};

function operationByID(id: string) {
  const row = groupedOperations(fixture).flatMap((group) => group.operations).find((operation) => operation.operationId === id);
  if (!row) throw new Error(`fixture operation missing: ${id}`);
  return row;
}

describe("openapi-data contract parsing", () => {
  it("recognizes a usable OpenAPI document", () => {
    expect(isOpenAPIDocument(fixture)).toBe(true);
    expect(isOpenAPIDocument(null)).toBe(false);
    expect(isOpenAPIDocument({ openapi: "3.0.3" })).toBe(false);
    expect(isOpenAPIDocument([])).toBe(false);
  });

  it("groups operations by tag preserving document order", () => {
    const groups = groupedOperations(fixture);
    expect(groups.map((group) => group.tag)).toEqual(["IAM", "Todo", "Navigation"]);
    expect(groups[0].operations[0].operationId).toBe("iam.session.read");
    expect(groups[1].operations[0].method).toBe("POST");
  });

  it("filters the operation tree by method/path/operationId", () => {
    const groups = groupedOperations(fixture);
    expect(filterOperationGroups(groups, "").length).toBe(3);
    expect(filterOperationGroups(groups, "todo").map((group) => group.tag)).toEqual(["Todo"]);
    expect(filterOperationGroups(groups, "navigation").map((group) => group.tag)).toEqual(["Navigation"]);
    expect(filterOperationGroups(groups, "patch").map((group) => group.operations.map((row) => row.method))).toEqual([["PATCH"]]);
    expect(filterOperationGroups(groups, "nonexistent")).toEqual([]);
  });

  it("reports security schemes and mutation methods", () => {
    expect(hasSecurityScheme(operationByID("todo.create"), "bearerAuth")).toBe(true);
    expect(hasSecurityScheme(operationByID("iam.session.read"), "webuiSession")).toBe(true);
    expect(hasSecurityScheme(operationByID("todo.create"), "webuiSession")).toBe(false);
    expect(isMutation("POST")).toBe(true);
    expect(isMutation("PATCH")).toBe(true);
    expect(isMutation("GET")).toBe(false);
  });

  it("projects editable execution parameters with type defaults", () => {
    expect(executionParameters(operationByID("todo.complete"))).toEqual([
      { name: "id", location: "path", required: true, type: "string", value: "" },
    ]);
    expect(executionParameters(operationByID("iam.session.read"))).toEqual([
      { name: "includeArchived", location: "query", required: false, type: "boolean", value: "false" },
    ]);
    expect(parameterDefaultValue({ type: "integer" })).toBe("0");
    expect(parameterDefaultValue(undefined)).toBe("");
  });

  it("summarizes the request body and response rows", () => {
    const body = requestBodySchema(operationByID("todo.create"));
    expect(body).toMatchObject({ required: true });
    expect(body?.schema?.$ref).toBe("#/components/schemas/CreateTodoRequest");
    const rows = responseRows(operationByID("todo.create"));
    expect(rows.map((row) => row.status)).toEqual(["201", "default"]);
    expect(rows[0].schema).toBe("ref Todo");
  });

  it("samples JSON from schemas with ref resolution and depth limits", () => {
    const schemas = fixture.components?.schemas;
    expect(sampleJSON(schemas?.SessionResponse, schemas)).toEqual({
      token: "string",
      expiresAt: "2026-01-01T00:00:00Z",
      active: true,
    });
    expect(sampleJSON(schemas?.CreateTodoRequest, schemas)).toEqual({ title: "string", tags: ["string"], flagged: true });
    // depth-limited recursion stays safe (the chain resolves three levels then stops).
    expect(sampleJSON({ type: "object", properties: { self: { $ref: "#/components/schemas/Simple" } } }, { Simple: { type: "object", properties: { self: { $ref: "#/components/schemas/Simple" } } } })).toEqual({ self: { self: { self: null } } });
  });

  it("projects schema property rows with required marks", () => {
    const rows = schemaPropertyRows(fixture.components?.schemas?.SessionResponse);
    expect(rows).toEqual([
      { name: "token", type: "string", required: true, description: "" },
      { name: "expiresAt", type: "string (date-time)", required: false, description: "" },
      { name: "active", type: "boolean", required: false, description: "" },
    ]);
  });

  it("summarizes refs and arrays", () => {
    expect(schemaSummary({ type: "array", items: { type: "string" } })).toBe("array<string>");
    expect(schemaSummary(undefined)).toBe("");
    expect(schemaSummary({ $ref: "#/components/schemas/Todo" })).toBe("ref Todo");
  });
});

describe("openapi-data request building", () => {
  it("builds a plain GET with query values", () => {
    const request = buildRequest(operationByID("iam.session.read"), {
      pathValues: {}, queryValues: { includeArchived: "true" }, origin: "https://example.test",
    });
    expect(request.method).toBe("GET");
    expect(request.url).toBe("/api/v1/iam/session?includeArchived=true");
    expect(request.headers).toEqual({});
    expect(request.body).toBeUndefined();
  });

  it("omits empty query values", () => {
    const request = buildRequest(operationByID("iam.session.read"), {
      pathValues: {}, queryValues: { includeArchived: "" }, origin: "https://example.test",
    });
    expect(request.url).toBe("/api/v1/iam/session");
  });

  it("expands and encodes path parameters", () => {
    const request = buildRequest(operationByID("todo.complete"), {
      pathValues: { id: "a/b c" }, queryValues: {}, origin: "https://example.test",
      bearerToken: "token-1",
    });
    expect(request.url).toBe("/api/v1/todos/a%2Fb%20c/complete");
    expect(request.headers.Authorization).toBe("Bearer token-1");
    // GET/PATCH with bearerAuth do not attach CSRF headers.
    expect(request.headers.Origin).toBeUndefined();
    expect(request.headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("injects bearer token and JSON body for mutations", () => {
    const request = buildRequest(operationByID("todo.create"), {
      pathValues: {}, queryValues: {}, origin: "https://example.test",
      bearerToken: "  token-2  ", bodyText: '{"title":"x"}',
    });
    expect(request.headers.Authorization).toBe("Bearer token-2");
    expect(request.headers["Content-Type"]).toBe("application/json");
    expect(request.body).toBe('{"title":"x"}');
  });

  it("attaches Origin and CSRF token only for webuiSession mutations", () => {
    const read = buildRequest(operationByID("iam.session.read"), {
      pathValues: {}, queryValues: {}, origin: "https://example.test", csrfToken: "csrf-1",
    });
    // GET is not a mutation: no CSRF headers even with a token available.
    expect(read.headers.Origin).toBeUndefined();
    expect(read.headers["X-CSRF-Token"]).toBeUndefined();

    const update = buildRequest(operationByID("navigation.menus.update"), {
      pathValues: { id: "m-1" }, queryValues: {}, origin: "https://example.test", csrfToken: "csrf-1",
    });
    expect(update.url).toBe("/api/v1/navigation/menus/m-1");
    expect(update.headers.Origin).toBe("https://example.test");
    expect(update.headers["X-CSRF-Token"]).toBe("csrf-1");
  });

  it("derives supported body encodings from the contract", () => {
    expect(bodyTypeOptions(operationByID("todo.create"))).toEqual(["json"]);
    expect(bodyTypeOptions(operationByID("iam.session.read"))).toEqual([]);
  });

  it("projects form rows and flags binary properties as files", () => {
    const rows = formFieldRows({ type: "object", properties: { file: { type: "string", format: "binary" }, title: { type: "string" }, count: { type: "integer" } } });
    expect(rows).toEqual([
      { name: "file", kind: "file", value: "" },
      { name: "title", kind: "text", value: "string" },
      { name: "count", kind: "text", value: "0" },
    ]);
    expect(formFieldRows(undefined)).toEqual([]);
  });

  it("serializes urlencoded bodies from form entries", () => {
    const request = buildRequest(operationByID("todo.create"), {
      pathValues: {}, queryValues: {}, origin: "https://example.test",
      bodyType: "urlencoded", formEntries: [["title", "hi there"], ["tags", "a,b"]],
    });
    expect(request.body).toBe("title=hi%20there&tags=a%2Cb");
    expect(request.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
  });

  it("merges extra headers and keeps JSON content type", () => {
    const request = buildRequest(operationByID("todo.create"), {
      pathValues: {}, queryValues: {}, origin: "https://example.test",
      bodyType: "json", bodyText: '{"title":"x"}', extraHeaders: { "X-Trace": "abc" },
    });
    expect(request.headers["X-Trace"]).toBe("abc");
    expect(request.headers["Content-Type"]).toBe("application/json");
    expect(request.body).toBe('{"title":"x"}');
  });
});

describe("openapi-data API tree (R075-009)", () => {
  it("builds group nodes from tags and operation leaves in order", () => {
    const tree = buildApiTree(fixture);
    expect(tree.map((node) => ({ id: node.id, kind: node.kind, label: node.label, count: treeNodeCount(node) }))).toEqual([
      { id: "group:IAM", kind: "group", label: "IAM", count: 1 },
      { id: "group:Todo", kind: "group", label: "Todo", count: 2 },
      { id: "group:Navigation", kind: "group", label: "Navigation", count: 1 },
    ]);
    const todo = tree[1];
    expect(todo.kind).toBe("group");
    if (todo.kind === "group") {
      expect(todo.children.map((child) => child.row?.operationId)).toEqual(["todo.create", "todo.complete"]);
      expect(todo.children[0].id).toBe("op:post-/api/v1/todos");
    }
  });

  it("nests dot-separated tag segments into deeper groups", () => {
    const nested: OpenAPIDocument = {
      openapi: "3.0.3",
      paths: {
        "/api/v1/x": {
          get: { operationId: "x.read", tags: ["IAM.Accounts.Profile"], responses: { "200": { description: "OK" } } },
        },
      },
    };
    const tree = buildApiTree(nested);
    expect(tree.map((node) => node.id)).toEqual(["group:IAM"]);
    const iam = tree[0];
    expect(iam.kind).toBe("group");
    if (iam.kind === "group") {
      expect(iam.children.map((node) => node.id)).toEqual(["group:IAM.Accounts"]);
      expect(iam.children[0].children.map((node) => node.id)).toEqual(["group:IAM.Accounts.Profile"]);
      expect(iam.children[0].children[0].children[0].row?.operationId).toBe("x.read");
    }
  });

  it("filters leaves and retains ancestor chains", () => {
    const tree = buildApiTree(fixture);
    const todo = filterApiTree(tree, "complete");
    expect(todo.map((node) => node.id)).toEqual(["group:Todo"]);
    const kept = todo[0];
    expect(kept.kind).toBe("group");
    if (kept.kind === "group") {
      expect(kept.children.map((child) => child.row?.operationId)).toEqual(["todo.complete"]);
    }
    expect(filterApiTree(tree, "")).toEqual(tree);
    expect(filterApiTree(tree, "missing")).toEqual([]);
  });
});