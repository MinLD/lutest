import type {
  DetectedApiSymbol,
  DetectedDeclarationSymbol,
} from "../symbol-detector";

export type ClassifiedGraphSymbols = {
  pages: DetectedDeclarationSymbol[];
  components: DetectedDeclarationSymbol[];
  apis: DetectedApiSymbol[];
};

export interface LegacyFrameworkAdapter {
  readonly name: string;
  isPage(relativePath: string): boolean;
  isApi(relativePath: string): boolean;
  isComponent(relativePath: string): boolean;
  classifySymbols(
    relativePath: string,
    symbols: {
      declarations: DetectedDeclarationSymbol[];
      apis: DetectedApiSymbol[];
    },
  ): ClassifiedGraphSymbols;
}
