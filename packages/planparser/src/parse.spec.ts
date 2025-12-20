import { describe, it, expect } from "vitest";
import { parseExplainAnalyzeJson } from "./parse.js";
import limit_index_scan_backward_flights from "./explain_examples/limit_index_scan_backward_flights.js";
import limit_nested_loop_memoize_airports_analyze from "./explain_examples/limit_nested_loop_memoize_airports_analyze.js";
import limit_nested_loop_memoize_airports from "./explain_examples/limit_nested_loop_memoize_airports.js";

describe("parseExplainAnalyzeJson", () => {
  it("should parse the explain analyze json", () => {
    const json = limit_index_scan_backward_flights;
    const result = parseExplainAnalyzeJson(json);
    expect(result).toBeDefined();
    expect(result.statements.length).toBe(1);
    expect(result.statements[0].meta.executionTimeMs).toBe(0.227);
    expect(result.statements[0].meta.planningTimeMs).toBe(0.473);
    expect(result.statements[0].root["Node Type"]).toBe("Limit");
    expect(result.statements[0].root.kind).toBe("KnownNode");
    expect(result.statements[0].root.children.length).toBe(1);
    expect(result.statements[0].root.children[0]["Node Type"]).toBe(
      "Index Scan",
    );
    expect(result.statements[0].root.children[0].kind).toBe("KnownNode");
    expect(result.statements[0].root.children[0].children.length).toBe(0);
  });

  it("should parse the explain analyze json with nested loop", () => {
    const json = limit_nested_loop_memoize_airports_analyze;
    const result = parseExplainAnalyzeJson(json);
    expect(result).toBeDefined();
    expect(result.statements.length).toBe(1);
    expect(result.statements[0].meta.executionTimeMs).toBe(0.289);
    expect(result.statements[0].meta.planningTimeMs).toBe(0.623);
    expect(result.statements[0].root["Node Type"]).toBe("Limit");
    expect(result.statements[0].root.kind).toBe("KnownNode");
    expect(result.statements[0].root.children.length).toBe(1);
    expect(result.statements[0].root.children[0]["Node Type"]).toBe(
      "Nested Loop",
    );
    expect(result.statements[0].root.children[0].kind).toBe("KnownNode");
    expect(result.statements[0].root.children[0].children.length).toBe(2);
    expect(result.statements[0].root.children[0].children[0]["Node Type"]).toBe(
      "Nested Loop",
    );
    expect(result.statements[0].root.children[0].children[0].kind).toBe(
      "KnownNode",
    );
    expect(
      result.statements[0].root.children[0].children[0].children.length,
    ).toBe(2);
    expect(
      result.statements[0].root.children[0].children[0].children[0][
        "Node Type"
      ],
    ).toBe("Index Scan");
    expect(
      result.statements[0].root.children[0].children[0].children[0].kind,
    ).toBe("KnownNode");
    expect(
      result.statements[0].root.children[0].children[0].children[0].children
        .length,
    ).toBe(0);
    expect(
      result.statements[0].root.children[0].children[0].children[1][
        "Node Type"
      ],
    ).toBe("Memoize");
    expect(
      result.statements[0].root.children[0].children[0].children[1].kind,
    ).toBe("KnownNode");
    expect(
      result.statements[0].root.children[0].children[0].children[1].children
        .length,
    ).toBe(1);
    expect(
      result.statements[0].root.children[0].children[0].children[1].children[0][
        "Node Type"
      ],
    ).toBe("Index Scan");
    expect(
      result.statements[0].root.children[0].children[0].children[1].children[0]
        .kind,
    ).toBe("KnownNode");
    expect(
      result.statements[0].root.children[0].children[0].children[1].children[0]
        .children.length,
    ).toBe(0);
    expect(result.statements[0].root.children[0].children[1]["Node Type"]).toBe(
      "Memoize",
    );
    expect(result.statements[0].root.children[0].children[1].kind).toBe(
      "KnownNode",
    );
    expect(
      result.statements[0].root.children[0].children[1].children.length,
    ).toBe(1);
    expect(
      result.statements[0].root.children[0].children[1].children[0][
        "Node Type"
      ],
    ).toBe("Index Scan");
    expect(
      result.statements[0].root.children[0].children[1].children[0].kind,
    ).toBe("KnownNode");
    expect(
      result.statements[0].root.children[0].children[1].children[0].children
        .length,
    ).toBe(0);
  });

  it("should parse the explain json with nested loop memoize airports", () => {
    const json = limit_nested_loop_memoize_airports;
    const result = parseExplainAnalyzeJson(json);
    expect(result).toBeDefined();
    expect(result.statements.length).toBe(1);
    expect(result.statements[0].meta.executionTimeMs).toBeUndefined();
    expect(result.statements[0].meta.planningTimeMs).toBeUndefined();
    expect(result.statements[0].root["Node Type"]).toBe("Limit");
    expect(result.statements[0].root.kind).toBe("KnownNode");
    expect(result.statements[0].root.children[0]["Node Type"]).toBe(
      "Nested Loop",
    );
    expect(result.statements[0].root.children[0].kind).toBe("KnownNode");
    expect(result.statements[0].root.children[0].children[0]["Node Type"]).toBe(
      "Nested Loop",
    );
    expect(result.statements[0].root.children[0].children[0].kind).toBe(
      "KnownNode",
    );
    expect(
      result.statements[0].root.children[0].children[0].children[0][
        "Node Type"
      ],
    ).toBe("Index Scan");
    expect(
      result.statements[0].root.children[0].children[0].children[0].kind,
    ).toBe("KnownNode");
    expect(
      result.statements[0].root.children[0].children[0].children[1][
        "Node Type"
      ],
    ).toBe("Memoize");
    expect(
      result.statements[0].root.children[0].children[0].children[1].kind,
    ).toBe("KnownNode");
    expect(
      result.statements[0].root.children[0].children[0].children[1].children[0][
        "Node Type"
      ],
    ).toBe("Index Scan");
    expect(
      result.statements[0].root.children[0].children[0].children[1].children[0]
        .kind,
    ).toBe("KnownNode");
    expect(result.statements[0].root.children[0].children[1]["Node Type"]).toBe(
      "Memoize",
    );
    expect(result.statements[0].root.children[0].children[1].kind).toBe(
      "KnownNode",
    );
    expect(
      result.statements[0].root.children[0].children[1].children[0][
        "Node Type"
      ],
    ).toBe("Index Scan");
    expect(
      result.statements[0].root.children[0].children[1].children[0].kind,
    ).toBe("KnownNode");
  });
});
