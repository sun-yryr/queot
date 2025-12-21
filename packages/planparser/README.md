# @sun-yryr/queot-planparser

PostgreSQL の `EXPLAIN (ANALYZE, FORMAT JSON)` 出力をパースし、`Plan` を **木構造**として扱えるようにする小さなライブラリです。

## 使い方

```ts
import {
  parseExplainAnalyzeJson,
  traversePlan,
} from "@sun-yryr/queot-planparser";

const jsonText = await fs.promises.readFile("explain.json", "utf8"); // 例
const result = parseExplainAnalyzeJson(jsonText);

const tree = result.statements[0];
console.log(tree.meta.executionTimeMs);

traversePlan(tree.root, (n) => {
  console.log(n.id, n["Node Type"], n.depth);
});
```

## バリデーション（Node Type 判別 + UnknownNodeフォールバック）

各 `PlanNode` は `ValidatedNode` をベースにしており、`effect` の `Schema` で **Node Type ごとの検証**を行います。

- `node.kind === "KnownNode"`: 既知ノードとしてスキーマに合致（`node["Node Type"]` で型が絞れます）
- `node.kind === "UnknownNode"`: スキーマ不一致 or 未知Node Type
  - `node["Node Type"]` は `"UnknownNode"` 固定
  - 元のNode Typeは `node.originalNodeType` / `node.raw["Node Type"]` に保持されます

## API

- `parseExplainAnalyzeJson(input, options?)`
  - **input**: `string | unknown`
  - **options.idStrategy**: `"path" | "preorder"`（デフォルト `"path"`）
- `traversePlan(root, visit)`
