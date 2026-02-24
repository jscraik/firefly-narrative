import { useEffect } from 'react';

/**
 * Attaches generic draggability to the external DialKit portal panel.
 * Since DialKit renders its DOM outside the main React tree, we query
 * the document and attach native event listeners.
 */
export function DialKitEnhancer() {
  useEffect(() => {
    let cleanupDrag: (() => void) | null = null;

    // Poll for the panel to be mounted by the DialRoot portal
    const interval = window.setInterval(() => {
      const panel = document.querySelector<HTMLElement>('.dialkit-panel');
      if (!panel || cleanupDrag) return;

      // We found the panel. Stop polling.
      window.clearInterval(interval);

      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initialLeft = 0;
      let initialTop = 0;

      const handleMouseDown = (event: MouseEvent) => {
        const target = event.target as HTMLElement;

        // Prevent drag on interactive elements
        if (
          target.tagName.toLowerCase() === 'input'
          || target.tagName.toLowerCase() === 'button'
          || target.closest('button')
          || target.closest('.dialkit-slider')
          || target.closest('.dialkit-toggle')
          || target.tagName.toLowerCase() === 'label'
          || target.tagName.toLowerCase() === 'svg'
        ) {
          return;
        }

        isDragging = true;
        startX = event.clientX;
        startY = event.clientY;

        // DialKit defaults to bottom/right positioning depending on props.
        // We calculate explicit top/left and lock it there for dragging.
        const rect = panel.getBoundingClientRect();
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.position = 'fixed';
        panel.style.margin = '0'; // neutralize any margin

        initialLeft = rect.left;
        initialTop = rect.top;

        // Temporarily disable transitions and selection
        panel.style.transition = 'none';
        document.body.style.userSelect = 'none';
      };

      const handleMouseMove = (event: MouseEvent) => {
        if (!isDragging) return;

        event.preventDefault();
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        panel.style.left = `${initialLeft + dx}px`;
        panel.style.top = `${initialTop + dy}px`;
      };

      const handleMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        panel.style.transition = '';
        document.body.style.userSelect = '';
      };

      // Ensure panel clearly indicates it is draggable on root non-interactive areas
      panel.style.cursor = 'grab';
      panel.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      cleanupDrag = () => {
        panel.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, 500);

    return () => {
      window.clearInterval(interval);
      cleanupDrag?.();
    };
  }, []);

  return null;
}
