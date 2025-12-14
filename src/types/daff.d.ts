declare module "daff" {
  // daff は CommonJS 由来のため、ESM では default export に API がまとまっている。
  // ここでは本リポジトリで利用する最小限の型だけをドキュメント/実動作に合わせて定義する。

  export type DaffCell = string | number | boolean | null | undefined;
  export type DaffSheet = DaffCell[][];

  export interface DaffJsonifiedTable {
    h: {
      sheet: DaffSheet;
    };
  }

  export class TableView {
    constructor(sheet: DaffSheet);
    width: number;
    height: number;
    getCell(x: number, y: number): DaffCell;
  }

  export interface TableAlignment {
    // daff.compareTables(...).align() の戻り値。詳細は daff 側の内部実装に依存するため any とする。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [k: string]: any;
  }

  export interface TableComparison {
    align(): TableAlignment;
  }

  export class CompareFlags {
    constructor();
  }

  export class TableDiff {
    constructor(alignment: TableAlignment, flags: CompareFlags);
    hilite(output: TableView): void;
  }

  export interface DaffDefaultExport {
    TableView: typeof TableView;
    CompareFlags: typeof CompareFlags;
    TableDiff: typeof TableDiff;
    compareTables: (a: TableView, b: TableView) => TableComparison;
    jsonify: (table: TableView) => DaffJsonifiedTable;
  }

  const daff: DaffDefaultExport;
  export default daff;
}
