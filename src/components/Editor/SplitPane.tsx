import React, { useState, useCallback, useRef } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  pane: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  leftPane: {
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  rightPane: {
    // No additional styles needed
  },
  divider: {
    width: '6px',
    cursor: 'col-resize',
    backgroundColor: 'transparent',
    position: 'relative',
    flexShrink: 0,
    zIndex: 10,
    '&:hover': {
      backgroundColor: tokens.colorBrandBackground2,
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '2px',
      height: '32px',
      backgroundColor: tokens.colorNeutralStroke1,
      borderRadius: '2px',
    },
  },
  dividerActive: {
    backgroundColor: tokens.colorBrandBackground2,
  },
  hidden: {
    display: 'none',
  },
});

type ViewMode = 'wysiwyg' | 'split' | 'markdown';

interface SplitPaneProps {
  viewMode: ViewMode;
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  defaultSplit?: number; // Percentage 0-100
  minSplit?: number;
  maxSplit?: number;
}

export function SplitPane({
  viewMode,
  leftPane,
  rightPane,
  defaultSplit = 50,
  minSplit = 20,
  maxSplit = 80,
}: SplitPaneProps) {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;

      setSplit(Math.max(minSplit, Math.min(maxSplit, percentage)));
    },
    [isDragging, minSplit, maxSplit]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const showLeft = viewMode === 'wysiwyg' || viewMode === 'split';
  const showRight = viewMode === 'markdown' || viewMode === 'split';
  const showDivider = viewMode === 'split';

  const leftWidth = viewMode === 'wysiwyg' ? '100%' : viewMode === 'split' ? `${split}%` : '0%';
  const rightWidth = viewMode === 'markdown' ? '100%' : viewMode === 'split' ? `${100 - split}%` : '0%';

  return (
    <div ref={containerRef} className={styles.container}>
      <div
        className={`${styles.pane} ${styles.leftPane} ${!showLeft ? styles.hidden : ''}`}
        style={{ width: leftWidth }}
      >
        {leftPane}
      </div>

      {showDivider && (
        <div
          className={`${styles.divider} ${isDragging ? styles.dividerActive : ''}`}
          onMouseDown={handleMouseDown}
        />
      )}

      <div
        className={`${styles.pane} ${styles.rightPane} ${!showRight ? styles.hidden : ''}`}
        style={{ width: rightWidth }}
      >
        {rightPane}
      </div>
    </div>
  );
}
