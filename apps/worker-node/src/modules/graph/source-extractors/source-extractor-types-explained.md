# Source Extractor Types — Giải thích từng type

File được giải thích:

```txt
apps/worker-node/src/modules/graph/source-extractors/source-extractor.types.ts
```

## 1. Mục đích của file này

File này không chứa logic chạy thật. Nó chỉ định nghĩa các kiểu dữ liệu đi qua pipeline graph mới.

Pipeline hiện tại nên hiểu như sau:

```txt
source file
  -> SourceExtractor
  -> ExtractedSourceFile
  -> RawSourceSymbol[]
  -> FrameworkAdapter
  -> ClassifiedSourceSymbol[]
  -> ProductionGraphNode[] sau này
```

Nói ngắn gọn:

```txt
RawSourceSymbol          = extractor đọc được gì từ code
ClassifiedSourceSymbol   = adapter quyết định symbol đó là page/component/api/hook gì
```

---

## 2. `SourceFileKind`

```ts
export type SourceFileKind =
  | "ts"
  | "tsx"
  | "js"
  | "jsx"
  | "vue"
  | "php"
  | "unsupported";
```

Type này mô tả loại file source.

Ví dụ:

```txt
page.tsx      -> "tsx"
api.ts        -> "ts"
Button.jsx    -> "jsx"
Home.vue      -> "vue"
index.php     -> "php"
README.md     -> "unsupported"
```

Điểm cần nhớ:

- Đây là loại file, không phải tên extractor.
- Hiện tại code thật mới support TS/JS.
- `"vue"` và `"php"` được để sẵn cho phase sau.
- `"unsupported"` dùng để không crash khi gặp file chưa hỗ trợ.

---

## 3. `ExtractorLanguage`

```ts
export type ExtractorLanguage = "ts-js" | "vue" | "php" | "unsupported";
```

Type này mô tả extractor nào đã xử lý file.

Ví dụ:

```txt
.tsx   -> "ts-js"
.jsx   -> "ts-js"
.vue   -> "vue" trong tương lai
.php   -> "php" trong tương lai
.txt   -> "unsupported"
```

Khác biệt quan trọng:

```txt
SourceFileKind     = file là loại gì
ExtractorLanguage  = bộ đọc nào xử lý file đó
```

---

## 4. `GraphConfidence`

```ts
export type GraphConfidence = "high" | "medium" | "low";
```

Type này mô tả độ tự tin của adapter khi phân loại symbol.

Ví dụ:

```txt
high:
  app/page.tsx + default export + JSX
  -> gần như chắc chắn là Next page

medium:
  PascalCase symbol nằm trong components/
  -> có khả năng là component

low:
  exported function bình thường
  -> có thể chỉ là utility
```

`confidence` không phải lỗi. Nó là thông tin để sau này UI/debug biết kết quả này chắc đến mức nào.

---

## 5. `RawSymbolKind`

```ts
export type RawSymbolKind =
  | "function"
  | "class"
  | "arrow-function"
  | "function-expression"
  | "method"
  | "vue-script-setup"
  | "php-class"
  | "php-method"
  | "unknown";
```

Type này mô tả hình dạng thô của symbol trong source code.

Ví dụ:

```ts
function Home() {}
```

```txt
rawKind = "function"
```

```ts
const Button = () => {};
```

```txt
rawKind = "arrow-function"
```

```ts
const load = function () {};
```

```txt
rawKind = "function-expression"
```

```ts
class UserService {}
```

```txt
rawKind = "class"
```

```ts
class A {
  render() {}
}
```

```txt
rawKind = "method"
```

Điểm cần nhớ:

- `RawSymbolKind` chưa nói symbol là page/component/api.
- Nó chỉ nói parser nhìn thấy declaration loại gì.
- Framework meaning nằm ở adapter, không nằm ở extractor.

---

## 6. `DirectNetworkTarget`

```ts
export type DirectNetworkTarget = {
  client: string;
  method?: string;
  target: string;
  line: number;
};
```

Type này lưu thông tin network call trực tiếp trong một symbol.

Ví dụ:

```ts
fetch("/api/users");
```

Có thể thành:

```ts
{
  client: "fetch",
  target: "/api/users",
  line: 12
}
```

Ví dụ:

```ts
axios.post("/api/login");
```

Có thể thành:

```ts
{
  client: "axios",
  method: "POST",
  target: "/api/login",
  line: 20
}
```

Ý nghĩa từng field:

```txt
client   tên client gọi API: fetch, axios, ky, ofetch, hoặc custom sau này
method   HTTP method nếu suy ra được: GET, POST, PUT...
target   URL/path được gọi
line     dòng trong source file
```

`client` để là `string` là đúng vì sau này có thể có:

```txt
apiClient.get(...)
Http::get(...)
Guzzle
curl
```

Không nên khóa cứng chỉ `"fetch" | "axios"` trong type chung.

---

## 7. `RawSourceSymbol`

```ts
export type RawSourceSymbol = {
  id: string;
  rawKind: RawSymbolKind;
  name: string;
  filePath: string;
  exported: boolean;
  defaultExport: boolean;
  pascalCase: boolean;
  hookName: boolean;
  hasJsx: boolean;
  hasDirectNetworkCall: boolean;
  directNetworkTargets: DirectNetworkTarget[];
  loc: {
    startLine: number;
    endLine: number;
  };
};
```

Đây là type quan trọng nhất của tầng extractor.

Nó mô tả một symbol thô được rút ra từ source file.

Ví dụ source:

```tsx
export default function Home() {
  return <DashboardShell />;
}
```

Có thể tạo ra:

```ts
{
  id: "raw:function:src/app/page.tsx#Home@1-3",
  rawKind: "function",
  name: "Home",
  filePath: "src/app/page.tsx",
  exported: true,
  defaultExport: true,
  pascalCase: true,
  hookName: false,
  hasJsx: true,
  hasDirectNetworkCall: false,
  directNetworkTargets: [],
  loc: {
    startLine: 1,
    endLine: 3
  }
}
```

Ý nghĩa từng field:

### `id`

ID unique của raw symbol.

Nên có dạng chứa file path và location:

```txt
raw:function:src/app/page.tsx#Home@1-3
```

Không nên chỉ dùng:

```txt
raw:function:src/app/page.tsx#Home
```

vì có thể trùng khi nhiều symbol cùng tên trong một file.

### `rawKind`

Loại declaration thô:

```txt
function
class
arrow-function
method
...
```

### `name`

Tên symbol.

Ví dụ:

```txt
Home
DashboardShell
useUser
GET
POST
```

Với default anonymous function, name có thể là `"default"`.

### `filePath`

File chứa symbol.

Nên dùng path đã normalize:

```txt
src/app/page.tsx
```

Không nên dùng lẫn:

```txt
src\app\page.tsx
```

### `exported`

Cho biết symbol có được export không.

Ví dụ:

```ts
export function Button() {}
```

```txt
exported = true
```

### `defaultExport`

Cho biết symbol có phải default export không.

Ví dụ:

```ts
export default function Home() {}
```

```txt
defaultExport = true
```

### `pascalCase`

Cho biết tên symbol có dạng PascalCase không.

Ví dụ:

```txt
Home             -> true
DashboardShell   -> true
button           -> false
useUser          -> false
```

Dùng để adapter nhận diện component/page candidate.

### `hookName`

Cho biết tên có dạng React hook không.

Ví dụ:

```txt
useUser       -> true
useAuthState  -> true
getUser       -> false
```

Dùng để adapter classify thành `hook`.

### `hasJsx`

Cho biết bên trong symbol có JSX không.

Ví dụ:

```tsx
function Button() {
  return <button>Click</button>;
}
```

```txt
hasJsx = true
```

Dùng để nhận diện component/page.

### `hasDirectNetworkCall`

Cho biết symbol có gọi network trực tiếp không.

Ví dụ:

```ts
async function getUsers() {
  return fetch("/api/users");
}
```

```txt
hasDirectNetworkCall = true
```

### `directNetworkTargets`

Danh sách endpoint/network call tìm được trong symbol.

Ví dụ:

```ts
[
  {
    client: "fetch",
    target: "/api/users",
    line: 10
  }
]
```

### `loc`

Vị trí dòng bắt đầu và kết thúc của symbol trong source file.

Dùng cho:

```txt
- unique ID
- debug
- report
- link tới source code sau này
```

---

## 8. `ClassifiedSourceSymbolKind`

```ts
export type ClassifiedSourceSymbolKind =
  | "page"
  | "component"
  | "hook"
  | "api-route"
  | "api-client-method"
  | "utility";
```

Đây là loại symbol sau khi đã qua framework adapter.

Ý nghĩa:

```txt
page:
  page/routing entry của framework

component:
  UI component

hook:
  React hook hoặc hook-like function

api-route:
  server API route handler

api-client-method:
  function/service gọi API/network

utility:
  exported function/class chưa thuộc role đặc biệt
```

Ví dụ:

```txt
src/app/page.tsx#Home
  -> page

src/components/Button.tsx#Button
  -> component

src/hooks/useUser.ts#useUser
  -> hook

src/app/api/users/route.ts#GET
  -> api-route

src/lib/api.ts#getUsers
  -> api-client-method

src/lib/format.ts#formatDate
  -> utility
```

---

## 9. `ClassifiedSourceSymbol`

```ts
export type ClassifiedSourceSymbol = {
  id: string;
  kind: ClassifiedSourceSymbolKind;
  name: string;
  filePath: string;
  exported: boolean;
  defaultExport: boolean;
  loc: {
    startLine: number;
    endLine: number;
  };
  confidence: GraphConfidence;
  reason: string;
};
```

Đây là output của adapter sau khi phân loại raw symbol.

Ví dụ raw symbol:

```ts
{
  name: "Home",
  filePath: "src/app/page.tsx",
  defaultExport: true,
  hasJsx: true
}
```

Qua Next adapter có thể thành:

```ts
{
  id: "page:src/app/page.tsx#Home@1-3",
  kind: "page",
  name: "Home",
  filePath: "src/app/page.tsx",
  exported: true,
  defaultExport: true,
  loc: {
    startLine: 1,
    endLine: 3
  },
  confidence: "high",
  reason: "Next page file component export"
}
```

Ý nghĩa field:

```txt
id             ID unique của classified symbol
kind           page/component/hook/api-route/api-client-method/utility
name           tên symbol
filePath       file chứa symbol
exported       có export không
defaultExport  có default export không
loc            vị trí source
confidence     adapter tự tin mức nào
reason         vì sao adapter classify như vậy
```

`reason` rất quan trọng. Không nên bỏ vì sau này UI/debug cần hiển thị lý do.

---

## 10. `ExtractedSourceFile`

```ts
export type ExtractedSourceFile = {
  filePath: string;
  kind: SourceFileKind;
  language: ExtractorLanguage;
  symbols: RawSourceSymbol[];
  parseDiagnostics: string[];
};
```

Đây là kết quả extractor trả về cho một file.

Ví dụ file hợp lệ:

```ts
{
  filePath: "src/app/page.tsx",
  kind: "tsx",
  language: "ts-js",
  symbols: [
    // RawSourceSymbol[]
  ],
  parseDiagnostics: []
}
```

Ví dụ file có syntax error:

```ts
{
  filePath: "src/app/page.tsx",
  kind: "tsx",
  language: "ts-js",
  symbols: [],
  parseDiagnostics: [
    "3:12 Expression expected"
  ]
}
```

Ví dụ file unsupported:

```ts
{
  filePath: "src/App.vue",
  kind: "unsupported",
  language: "unsupported",
  symbols: [],
  parseDiagnostics: [
    "Unsupported source file type: src/App.vue"
  ]
}
```

Điểm cần nhớ:

- Extractor không nên throw khi gặp file unsupported.
- Extractor nên trả diagnostics để scan không bị crash toàn project.
- `symbols` là raw symbols, chưa classify.

---

## 11. `SourceExtractor`

```ts
export interface SourceExtractor {
  readonly language: ExtractorLanguage;

  supports(filePath: string): boolean;

  extract(input: {
    filePath: string;
    content: string;
  }): ExtractedSourceFile;
}
```

Đây là interface bắt buộc cho mọi source extractor.

Một extractor cần làm 2 việc:

```txt
supports(filePath)
  -> trả lời extractor này có xử lý file này không

extract({ filePath, content })
  -> đọc content và trả ExtractedSourceFile
```

Ví dụ TS/JS extractor:

```ts
export const tsJsSourceExtractor: SourceExtractor = {
  language: "ts-js",

  supports(filePath) {
    return filePath.endsWith(".ts")
      || filePath.endsWith(".tsx")
      || filePath.endsWith(".js")
      || filePath.endsWith(".jsx");
  },

  extract({ filePath, content }) {
    return parseAndExtractRawSymbols(filePath, content);
  }
};
```

Sau này Vue extractor cũng phải theo contract này:

```ts
export const vueSourceExtractor: SourceExtractor = {
  language: "vue",

  supports(filePath) {
    return filePath.endsWith(".vue");
  },

  extract({ filePath, content }) {
    // parse .vue
  }
};
```

Điểm cần nhớ:

```txt
SourceExtractor = hiểu file format / ngôn ngữ
FrameworkAdapter = hiểu framework convention
```

Không được nhét logic Next/React vào source extractor.

---

## 12. Compatibility aliases `Ast*`

```ts
export type AstConfidence = GraphConfidence;
export type RawAstSymbolKind = RawSymbolKind;
export type RawAstSymbol = RawSourceSymbol;
export type AstSymbolKind = ClassifiedSourceSymbolKind;
export type AstSymbolDeclaration = ClassifiedSourceSymbol;
export type ParsedSourceFile = ExtractedSourceFile;
```

Đây là alias để code cũ chưa bị vỡ sau refactor.

Nghĩa là:

```txt
AstConfidence          = GraphConfidence
RawAstSymbol           = RawSourceSymbol
AstSymbolDeclaration   = ClassifiedSourceSymbol
ParsedSourceFile       = ExtractedSourceFile
```

Không nên dùng các tên này cho code mới.

Code mới nên dùng:

```txt
RawSourceSymbol
ExtractedSourceFile
ClassifiedSourceSymbol
```

Không nên dùng:

```txt
RawAstSymbol
ParsedSourceFile
AstSymbolDeclaration
```

Lý do:

```txt
ast/ là compatibility layer cũ
source-extractors/ là kiến trúc mới
```

---

## 13. Ví dụ end-to-end

Source file:

```tsx
// src/app/page.tsx
export default function Home() {
  return <DashboardShell />;
}
```

Extractor tạo raw symbol:

```ts
{
  rawKind: "function",
  name: "Home",
  filePath: "src/app/page.tsx",
  defaultExport: true,
  hasJsx: true,
  pascalCase: true
}
```

Next adapter classify:

```ts
{
  kind: "page",
  name: "Home",
  confidence: "high",
  reason: "Next page file component export"
}
```

Graph builder sau này tạo node:

```txt
page:src/app/page.tsx#Home@1-3
```

---

## 14. Quy tắc thiết kế cần nhớ

```txt
source-extractors không biết framework
adapters không parse AST trực tiếp
ast không chứa logic mới
ClassifiedSourceSymbol phải có reason
ID phải unique và deterministic
Unsupported file không được làm crash scan
```

---

## 15. Bảng tóm tắt

| Type | Tầng | Vai trò |
|---|---|---|
| `SourceFileKind` | Extractor | Loại file |
| `ExtractorLanguage` | Extractor | Extractor xử lý file |
| `GraphConfidence` | Adapter | Độ tự tin khi classify |
| `RawSymbolKind` | Extractor | Loại declaration thô |
| `DirectNetworkTarget` | Extractor | Network call trực tiếp |
| `RawSourceSymbol` | Extractor | Symbol thô đọc từ source |
| `ClassifiedSourceSymbolKind` | Adapter | Role sau khi classify |
| `ClassifiedSourceSymbol` | Adapter | Symbol đã có role |
| `ExtractedSourceFile` | Extractor | Kết quả extract một file |
| `SourceExtractor` | Extractor | Interface cho mọi extractor |
| `Ast*` aliases | Legacy | Compatibility cho code cũ |
