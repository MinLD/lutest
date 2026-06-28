export interface FrameworkAdapter {
  readonly name: string;
  isPage(relativePath: string): boolean;
  isApi(relativePath: string): boolean;
  isComponent(relativePath: string): boolean;
}
