import type { AlignmentGuide } from '../utils/widgetSnap';

interface WidgetEditGuidesProps {
  visible: boolean;
  guides: AlignmentGuide[];
}

export function WidgetEditGuides({ visible, guides }: WidgetEditGuidesProps) {
  if (!visible || guides.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 80,
      }}
    >
      {guides.map((guide, index) => {
        if (guide.orientation === 'vertical') {
          return (
            <div
              key={`${guide.orientation}-${guide.position}-${index}`}
              data-guide-line
              style={{
                position: 'absolute',
                top: `${guide.start ?? 0}px`,
                height: `${Math.max(1, (guide.end ?? window.innerHeight) - (guide.start ?? 0))}px`,
                left: `${guide.position}px`,
                width: '1px',
                background: 'linear-gradient(180deg, rgba(255,215,0,0) 0%, rgba(255,215,0,0.72) 50%, rgba(255,215,0,0) 100%)',
                boxShadow: '0 0 8px rgba(255, 215, 0, 0.4)',
              }}
            />
          );
        }

        return (
          <div
            key={`${guide.orientation}-${guide.position}-${index}`}
            data-guide-line
            style={{
              position: 'absolute',
              left: `${guide.start ?? 0}px`,
              width: `${Math.max(1, (guide.end ?? window.innerWidth) - (guide.start ?? 0))}px`,
              top: `${guide.position}px`,
              height: '1px',
              background: 'linear-gradient(90deg, rgba(255,215,0,0) 0%, rgba(255,215,0,0.72) 50%, rgba(255,215,0,0) 100%)',
              boxShadow: '0 0 8px rgba(255, 215, 0, 0.4)',
            }}
          />
        );
      })}
    </div>
  );
}
