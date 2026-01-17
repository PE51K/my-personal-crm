declare module 'react-graph-vis' {
  import { Component } from 'react';

  export interface Node {
    id: string | number;
    label?: string;
    title?: string;
    color?: any;
    shape?: string;
    image?: string | undefined;
    size?: number;
    font?: any;
    borderWidth?: number;
    borderWidthSelected?: number;
    [key: string]: any;
  }

  export interface Edge {
    id: string | number;
    from: string | number;
    to: string | number;
    label?: string;
    smooth?: boolean | any;
    color?: any;
    width?: number;
    font?: any;
    [key: string]: any;
  }

  export interface GraphData {
    nodes: Node[];
    edges: Edge[];
  }

  export interface GraphEvents {
    [key: string]: (params?: any) => void;
  }

  export interface GraphOptions {
    [key: string]: any;
  }

  interface GraphProps {
    graph: GraphData;
    options?: GraphOptions;
    events?: GraphEvents;
    getNetwork?: (network: any) => void;
    style?: React.CSSProperties;
  }

  export default class Graph extends Component<GraphProps> {}
}
