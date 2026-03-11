/**
 * Accounting Flow Page
 *
 * Route component for the Accounting Engine Visualization System
 */

import { Component, onMount, onCleanup, createEffect } from 'solid-js';
import AccountingFlowVisualization from '../components/AccountingFlowVisualization';
import { flowVisualizationStore } from '../stores/flowVisualizationStore';

const AccountingFlowPage: Component = () => {
  // Keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        flowVisualizationStore.togglePlayback();
        break;
      case 'ArrowRight':
        e.preventDefault();
        flowVisualizationStore.nextStage();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        flowVisualizationStore.prevStage();
        break;
      case 'r':
      case 'R':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          flowVisualizationStore.reset();
        }
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          flowVisualizationStore.goToStage(parseInt(e.key) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
        }
        break;
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
    flowVisualizationStore.pause();
  });

  return (
    <div style={{
      "min-height": "100vh",
      "background": "#f8fafc",
      "padding": "24px"
    }}>
      {/* Page Header */}
      <div style={{
        "margin-bottom": "24px"
      }}>
        <h1 style={{
          "font-size": "28px",
          "font-weight": "700",
          "color": "#1e293b",
          "margin": "0 0 8px 0"
        }}>
          🔄 Accounting Engine Visualization
        </h1>
        <p style={{
          "color": "#64748b",
          "margin": "0",
          "font-size": "14px"
        }}>
          Interactive visualization of the 7-stage transaction processing pipeline
        </p>

        {/* Keyboard shortcuts hint */}
        <div style={{
          "margin-top": "12px",
          "display": "flex",
          "gap": "16px",
          "flex-wrap": "wrap"
        }}>
          <span style={{
            "font-size": "12px",
            "color": "#94a3b8",
            "display": "flex",
            "align-items": "center",
            "gap": "4px"
          }}>
            <kbd style={{
              "background": "#e2e8f0",
              "padding": "2px 6px",
              "border-radius": "4px",
              "font-family": "monospace",
              "font-size": "11px"
            }}>Space</kbd>
            Play/Pause
          </span>
          <span style={{
            "font-size": "12px",
            "color": "#94a3b8",
            "display": "flex",
            "align-items": "center",
            "gap": "4px"
          }}>
            <kbd style={{
              "background": "#e2e8f0",
              "padding": "2px 6px",
              "border-radius": "4px",
              "font-family": "monospace",
              "font-size": "11px"
            }}>←</kbd>
            <kbd style={{
              "background": "#e2e8f0",
              "padding": "2px 6px",
              "border-radius": "4px",
              "font-family": "monospace",
              "font-size": "11px"
            }}>→</kbd>
            Navigate
          </span>
          <span style={{
            "font-size": "12px",
            "color": "#94a3b8",
            "display": "flex",
            "align-items": "center",
            "gap": "4px"
          }}>
            <kbd style={{
              "background": "#e2e8f0",
              "padding": "2px 6px",
              "border-radius": "4px",
              "font-family": "monospace",
              "font-size": "11px"
            }}>1-7</kbd>
            Jump to Stage
          </span>
          <span style={{
            "font-size": "12px",
            "color": "#94a3b8",
            "display": "flex",
            "align-items": "center",
            "gap": "4px"
          }}>
            <kbd style={{
              "background": "#e2e8f0",
              "padding": "2px 6px",
              "border-radius": "4px",
              "font-family": "monospace",
              "font-size": "11px"
            }}>R</kbd>
            Reset
          </span>
        </div>
      </div>

      {/* Main Visualization */}
      <AccountingFlowVisualization />
    </div>
  );
};

export default AccountingFlowPage;
