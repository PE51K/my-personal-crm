declare module 'react-graph-vis' {
  import { Component } from 'react';

  export interface NodeColor {
    background?: string;
    border?: string;
    highlight?: { background?: string; border?: string };
    hover?: { background?: string; border?: string };
  }

  export interface NodeFont {
    color?: string;
    size?: number;
    face?: string;
  }

  export interface Node {
    id: string | number;
    label?: string;
    title?: string;
    color?: string | NodeColor;
    shape?: string;
    image?: string | undefined;
    size?: number;
    font?: NodeFont;
    borderWidth?: number;
    borderWidthSelected?: number;
    [key: string]: unknown;
  }

  export interface Edge {
    id: string | number;
    from: string | number;
    to: string | number;
    label?: string;
    smooth?: boolean | { type?: string; roundness?: number };
    color?: string | { color?: string; highlight?: string; hover?: string };
    width?: number;
    font?: NodeFont;
    [key: string]: unknown;
  }

  export interface GraphData {
    nodes: Node[];
    edges: Edge[];
  }

  export interface GraphEvents {
    [key: string]: (params?: unknown) => void;
  }

  export interface GraphOptions {
    [key: string]: unknown;
  }

  interface GraphProps {
    graph: GraphData;
    options?: GraphOptions;
    events?: GraphEvents;
    getNetwork?: (network: unknown) => void;
    style?: React.CSSProperties;
  }

  export default class Graph extends Component<GraphProps> {}
}
