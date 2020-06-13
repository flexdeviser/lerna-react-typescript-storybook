import React, { FC, useState, useRef, useEffect } from 'react';
import { ViewConfig, FgpGraph } from '@eric4hy/graphs';
type GraphProps = {
  viewConfigs: Array<ViewConfig>;
  onReady?(div: HTMLDivElement, g: FgpGraph): void;
  viewChangeListener?(g: FgpGraph, view: ViewConfig): void;
  intervalChangeListener?(g: FgpGraph, interval: { name: string; value: number; show?: boolean }): void;
};
export const Graphs: FC<GraphProps> = ({ viewConfigs, viewChangeListener, intervalChangeListener, onReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // random id
  const [id] = useState(Math.random() * 1000);
  useEffect(() => {
    // check div
    if (!containerRef.current) return;
    // create graph obj
    const graph = new FgpGraph(containerRef.current, viewConfigs, {
      onViewChange: viewChangeListener,
      onIntervalChange: intervalChangeListener,
    });
    if (!onReady) graph.initGraph(undefined, true);
    graph.initGraph((fgpGraph: FgpGraph) => {
      onReady(containerRef.current, fgpGraph);
    }, true);
  }, []);

  return <div fgp-graph-id={`Graph${id}`} ref={containerRef}></div>;
};
