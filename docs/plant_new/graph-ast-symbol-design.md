# LUTEST — Graph AST Symbol Design

Phiên bản: 1.0  
Ngày: 30/06/2026  
Nguồn chuẩn: `master-srs-production.md`  
Mục tiêu: thiết kế graph production cho Lutest ở mức AST symbol-level, thay thế cách đếm file/heuristic của MVP.

---

## 0. Problem Statement

Graph v1 hiện có giá trị MVP nhưng chưa đủ production nếu chỉ:

```txt
source file -> GraphNode
path convention -> page/component/api/file
regex import parser -> import edges cơ bản
file có fetch -> api node
```

Production graph phải trả lời được:

```txt
Page nào render component nào?
Component nào dùng hook nào?
Hook/service nào gọi API client nào?
API client method nào gọi endpoint nào?
Runtime issue trên route X có khả năng liên quan source node nào?
```

---

## 1. Design Goals

1. Build graph từ AST, không chỉ path heuristic.
2. Count component/API theo declarations/symbols, không chỉ file.
3. Resolve import aliases và relative imports.
4. Detect JSX render relationships.
5. Trace call chain tối thiểu: page/component -> hook/service -> API client -> fetch/axios endpoint.
6. Có confidence score cho edge không chắc chắn.
7. Không crash toàn graph vì một file parse lỗi.
8. Output phải runtime-validate được.

---

## 2. Non-goals trong phase đầu production

Không cần ngay:

1. Full TypeScript type checker toàn project nếu quá nặng.
2. 100% dynamic endpoint resolution.
3. Full interprocedural analysis như compiler.
4. Full PHP/Laravel AST nếu chưa đủ scope.
5. Detect mọi custom client pattern.

Nhưng phải thiết kế mở để thêm sau.

---

## 3. Graph Modes

### 3.1 file mode

Dùng khi AST parser fail hoặc cần fallback nhanh.

```txt
file -> node
relative import -> edge
```

### 3.2 symbol mode

Default production mode.

```txt
file -> parsed AST
AST -> symbols
symbols -> nodes
imports/calls/jsx/http -> edges
```

### 3.3 mixed mode

Nếu một số file parse fail:

1. File parse được => symbol-level.
2. File parse lỗi => fallback file node + diagnostic.
3. Graph response vẫn hợp lệ.

---

## 4. Internal Architecture

```txt
GraphService
  -> SourceFileCollector
  -> FrameworkAdapter
  -> AstParser
  -> SymbolExtractor
  -> ImportResolver
  -> JsxUsageExtractor
  -> CallExtractor
  -> ApiCallExtractor
  -> RouteDiscovery
  -> GraphLinker
  -> GraphValidator
  -> GraphRepository
```

Suggested files:

```txt
apps/worker-node/src/modules/graph/
  graph.service.ts
  graph.repository.ts
  graph.mapper.ts
  symbol-graph.builder.ts
  route-discovery.ts
  import-resolver.ts
  graph-linker.ts
  api-trace.service.ts
  ast/
    ast-parser.ts
    symbol-extractor.ts
    import-extractor.ts
    jsx-usage-extractor.ts
    call-extractor.ts
    api-call-extractor.ts
    types.ts
```

---

## 5. Internal Types

### 5.1 ParsedSourceFile

```ts
export type ParsedSourceFile = {
  filePath: string;
  absolutePath: string;
  language: "ts" | "tsx" | "js" | "jsx";
  imports: ImportSymbol[];
  exports: ExportSymbol[];
  declarations: SymbolDeclaration[];
  jsxUses: JsxUse[];
  calls: CallExpressionInfo[];
  apiCalls: ApiCallInfo[];
  diagnostics: ParseDiagnostic[];
};
```

### 5.2 SymbolDeclaration

```ts
export type SymbolKind =
  | "page"
  | "component"
  | "hook"
  | "api-route-handler"
  | "api-client-method"
  | "utility"
  | "unknown";

export type SymbolDeclaration = {
  id: string;
  name: string;
  kind: SymbolKind;
  filePath: string;
  exported: boolean;
  defaultExport: boolean;
  loc: SourceLocation;
};
```

### 5.3 ImportSymbol

```ts
export type ImportSymbol = {
  source: string;
  resolvedFilePath?: string;
  kind: "named" | "default" | "namespace" | "side-effect" | "require";
  importedName?: string;
  localName?: string;
  loc: SourceLocation;
  confidence: "high" | "medium" | "low";
};
```

### 5.4 JsxUse

```ts
export type JsxUse = {
  localName: string;
  loc: SourceLocation;
};
```

### 5.5 CallExpressionInfo

```ts
export type CallExpressionInfo = {
  calleeName: string;
  objectName?: string;
  propertyName?: string;
  args: string[];
  loc: SourceLocation;
};
```

### 5.6 ApiCallInfo

```ts
export type ApiCallInfo = {
  kind: "fetch" | "axios" | "ky" | "ofetch" | "custom-client";
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  target?: string;
  dynamic: boolean;
  loc: SourceLocation;
  confidence: "high" | "medium" | "low";
};
```

---

## 6. Public Graph Contract

```ts
export type GraphNodeKind =
  | "file"
  | "page"
  | "component"
  | "hook"
  | "api-route"
  | "api-client-method"
  | "utility"
  | "external-endpoint";

export type GraphEdgeKind =
  | "import"
  | "render"
  | "call"
  | "http"
  | "route";

export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  name: string;
  filePath?: string;
  loc?: SourceLocation;
  route?: string;
  http?: {
    method?: string;
    path?: string;
  };
  metadata?: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  kind: GraphEdgeKind;
  source: string;
  target: string;
  confidence: "high" | "medium" | "low";
  reason: string;
};
```

---

## 7. Framework Adapter Design

### 7.1 Adapter interface

```ts
export type FrameworkAdapter = {
  name: "next" | "vite-react" | "react" | "vue" | "laravel" | "php" | "unknown";
  discoverRoutes(input: RouteDiscoveryInput): RouteDiscoveryResult;
  classifyFile(input: ClassifyFileInput): FileClassification;
  classifySymbol(input: ClassifySymbolInput): SymbolKind;
};
```

### 7.2 Next.js adapter rules

#### App Router

```txt
app/page.tsx                  -> route /
app/products/page.tsx         -> route /products
app/products/[id]/page.tsx    -> route /products/:id
app/api/checkout/route.ts     -> API route /api/checkout
```

#### Pages Router

```txt
pages/index.tsx               -> route /
pages/products.tsx            -> route /products
pages/products/[id].tsx       -> route /products/:id
pages/api/checkout.ts         -> API route /api/checkout
```

### 7.3 Vite React adapter rules

Vite React has no file-based routes by default. Route discovery should:

1. Parse React Router if installed and detectable.
2. Detect `<Route path="..." element={...} />`.
3. Fallback to root route `/` if no route info.
4. Emit diagnostic `ROUTES_UNRESOLVED` if route system unknown.

---

## 8. Symbol Classification Rules

### 8.1 Page

A symbol is `page` if:

1. File is framework route page file.
2. Default export component in page file.
3. Framework adapter says file is page route.

### 8.2 Component

A declaration is `component` if:

1. Function/class returns JSX.
2. Name is PascalCase and file is `.tsx/.jsx`.
3. Exported declaration used as JSX elsewhere.
4. `memo`, `forwardRef`, `React.memo` wrapping component.

Examples:

```tsx
export function ProductCard() {
  return <div />;
}

const Header = () => <header />;
export default Header;
```

### 8.3 Hook

A declaration is `hook` if:

1. Name starts with `use` followed by uppercase letter.
2. Function body calls React hook or custom hook.

Examples:

```ts
export function useCart() {}
const useProducts = () => {};
```

### 8.4 API route

A symbol is `api-route` if:

1. Next App Router `app/api/**/route.ts` exports HTTP method function.
2. Next Pages Router `pages/api/**` default export handler.
3. Laravel/PHP support can be added later via adapter.

### 8.5 API client method

A declaration is `api-client-method` if:

1. Function calls `fetch`, `axios`, `ky`, `ofetch`.
2. Function calls known configured client.
3. Function wraps another API client method.

---

## 9. Import Resolver

### 9.1 Must resolve

1. Relative imports:
   ```ts
   import { A } from "./A";
   import { B } from "../B";
   ```
2. Index files:
   ```txt
   ./components -> ./components/index.tsx
   ```
3. Extension candidates:
   ```txt
   .ts .tsx .js .jsx
   ```
4. TS path aliases from `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```

### 9.2 Confidence

| Condition | Confidence |
|---|---|
| Exact relative file resolved | high |
| Alias resolved from tsconfig | high |
| Index fallback resolved | high |
| Dynamic import partial | medium/low |
| Unresolved alias | low + diagnostic |

---

## 10. Edge Creation Rules

### 10.1 import edge

Create when file A imports file B.

```json
{
  "kind": "import",
  "source": "app/products/page.tsx",
  "target": "components/ProductGrid.tsx",
  "confidence": "high",
  "reason": "Named import resolved by tsconfig path alias"
}
```

### 10.2 render edge

Create when symbol A JSX-renders symbol B.

```tsx
<ProductGrid products={products} />
```

Edge:

```json
{
  "kind": "render",
  "source": "app/products/page.tsx#ProductsPage",
  "target": "components/ProductGrid.tsx#ProductGrid",
  "confidence": "high",
  "reason": "JSX element resolved from named import"
}
```

### 10.3 call edge

Create when symbol A calls symbol B and B is resolved.

```ts
const products = useProducts();
```

Edge:

```json
{
  "kind": "call",
  "source": "app/products/page.tsx#ProductsPage",
  "target": "hooks/useProducts.ts#useProducts",
  "confidence": "high",
  "reason": "Call expression resolved to imported hook"
}
```

### 10.4 http edge

Create when API client method calls endpoint.

```ts
return fetch("/api/products");
```

Edge:

```json
{
  "kind": "http",
  "source": "lib/api-client.ts#getProducts",
  "target": "http:GET /api/products",
  "confidence": "high",
  "reason": "Static fetch string literal"
}
```

### 10.5 route edge

Create from route path to page/API route symbol.

```json
{
  "kind": "route",
  "source": "route:/products",
  "target": "app/products/page.tsx#ProductsPage",
  "confidence": "high",
  "reason": "Next.js app router page file"
}
```

---

## 11. API Call Detection

### 11.1 fetch

```ts
fetch("/api/products")
fetch("/api/products", { method: "POST" })
```

Rules:

- No method => `GET`.
- Static string => high confidence.
- Template literal with dynamic values => medium/low.

### 11.2 axios

```ts
axios.get("/api/products")
axios.post("/api/checkout", body)
axios({ method: "POST", url: "/api/checkout" })
```

### 11.3 ky

```ts
ky.get("/api/products")
ky.post("/api/checkout")
```

### 11.4 ofetch

```ts
ofetch("/api/products")
ofetch("/api/checkout", { method: "POST" })
```

### 11.5 custom client minimal support

Configurable known clients:

```yaml
apiClients:
  - name: api
    methods:
      get: GET
      post: POST
      put: PUT
      patch: PATCH
      delete: DELETE
```

Detect:

```ts
api.get("/products")
http.post("/checkout")
client.request({ method: "GET", url: "/products" })
```

If client cannot be resolved, create diagnostic with low confidence, not fake high-confidence graph.

---

## 12. Runtime-to-source Mapping

When Playwright reports issue:

```json
{
  "route": "/cart",
  "type": "overflow",
  "selector": "table.cart-table"
}
```

Mapping steps:

1. Find route node `route:/cart`.
2. Follow route edge to page symbol.
3. Follow render edges to components.
4. Use selector hints/class names/text if available.
5. Rank possible source nodes.
6. Attach `nodeIds` to issue.

Example:

```json
{
  "id": "overflow:/cart:table.cart-table",
  "type": "overflow",
  "severity": "warning",
  "message": "Cart table overflows viewport on /cart",
  "route": "/cart",
  "nodeIds": [
    "app/cart/page.tsx#CartPage",
    "components/CartTable.tsx#CartTable"
  ]
}
```

---

## 13. Diagnostics

Graph must report partial failures instead of hiding them.

```ts
export type GraphDiagnostic = {
  code:
    | "PARSE_ERROR"
    | "IMPORT_UNRESOLVED"
    | "DYNAMIC_ENDPOINT"
    | "ALIAS_UNRESOLVED"
    | "UNSUPPORTED_FILE"
    | "ROUTES_UNRESOLVED";
  severity: "info" | "warning" | "error";
  message: string;
  filePath?: string;
  loc?: SourceLocation;
};
```

Examples:

```json
{
  "code": "IMPORT_UNRESOLVED",
  "severity": "warning",
  "message": "Cannot resolve alias @/legacy/client",
  "filePath": "hooks/useLegacy.ts"
}
```

---

## 14. Persistence

Graph snapshot path:

```txt
.lutest/graph/latest-graph.json
```

Rules:

1. Validate graph response before write.
2. Atomic write preferred.
3. Do not write graph outside target project `.lutest`.
4. Include mode and diagnostics.
5. If schema invalid, fail clearly; do not persist corrupted graph.

---

## 15. Performance Budget

Initial production budgets:

```ts
export type GraphBudgetConfig = {
  maxFiles: number;
  maxFileSizeBytes: number;
  maxParseTimeMsPerFile: number;
  maxTotalGraphTimeMs: number;
};
```

Recommended defaults:

```txt
maxFiles = 5000
maxFileSizeBytes = 1_000_000
maxParseTimeMsPerFile = 1000
maxTotalGraphTimeMs = 30000
```

If exceeded:

1. Emit diagnostic.
2. Continue partial graph if safe.
3. Do not hang worker.

---

## 16. Test Fixtures Required

Minimum:

```txt
fixtures/next-basic-shop
fixtures/next-custom-api-client
fixtures/next-dynamic-routes
fixtures/vite-react-router
fixtures/react-no-router
fixtures/alias-imports
fixtures/parse-error-recovery
```

Each fixture must assert:

1. Node count.
2. Edge count.
3. Specific nodes exist.
4. Specific edges exist.
5. Diagnostics expected.
6. No unexpected high-confidence dynamic edge.

---

## 17. Example End-to-End

Input:

```tsx
// app/products/page.tsx
import { ProductGrid } from "@/components/ProductGrid";
import { useProducts } from "@/hooks/useProducts";

export default function ProductsPage() {
  const products = useProducts();
  return <ProductGrid products={products} />;
}
```

```ts
// hooks/useProducts.ts
import { getProducts } from "@/lib/api-client";

export function useProducts() {
  return getProducts();
}
```

```ts
// lib/api-client.ts
export async function getProducts() {
  return fetch("/api/products");
}
```

Expected graph:

```txt
route:/products
  -> app/products/page.tsx#ProductsPage
  -> components/ProductGrid.tsx#ProductGrid

app/products/page.tsx#ProductsPage
  -> hooks/useProducts.ts#useProducts
  -> lib/api-client.ts#getProducts
  -> http:GET /api/products
```

Expected counts:

```json
{
  "pageCount": 1,
  "componentCount": 1,
  "hookCount": 1,
  "apiClientMethodCount": 1,
  "externalEndpointCount": 1
}
```

---

## 18. Definition of Done

Graph module is `Production Done` only when:

1. AST parser supports TS/TSX/JS/JSX.
2. Component count is declaration-based.
3. API count is symbol/call-based.
4. Import resolver supports relative/index/extensions/tsconfig aliases.
5. Render/call/http/route edges exist.
6. Custom client minimal trace exists.
7. Diagnostics are returned.
8. Graph response has runtime validator.
9. Graph snapshot write validates schema.
10. Fixture tests pass.
