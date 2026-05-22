import { useCallback, useRef, useState } from 'react';

interface UseResizableOptions {
  defaultWidth: number;
  minWidth: number;
  maxWidth?: number;
  direction?: 'left' | 'right';
}

export function useResizable({ defaultWidth, minWidth, maxWidth, direction = 'right' }: UseResizableOptions) {
  const [width, setWidth] = useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const prevWidthRef = useRef(defaultWidth);
  const isDraggingRef = useRef(false);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = direction === 'right' ? ev.clientX - startX : startX - ev.clientX;
      const newWidth = Math.max(minWidth, maxWidth ? Math.min(maxWidth, startWidth + delta) : startWidth + delta);
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width, minWidth, maxWidth, direction]);

  const toggleCollapse = useCallback(() => {
    if (isCollapsed) {
      setWidth(prevWidthRef.current);
      setIsCollapsed(false);
    } else {
      prevWidthRef.current = width;
      setIsCollapsed(true);
    }
  }, [isCollapsed, width]);

  return {
    width: isCollapsed ? 0 : width,
    isCollapsed,
    startDrag,
    toggleCollapse,
    setWidth,
  };
}
