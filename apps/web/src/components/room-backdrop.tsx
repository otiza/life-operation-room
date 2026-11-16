/*
  The room's texture layers — canvas, pattern, grain — fixed behind the shell (THEMES-PLAN PR 3).
  Purely decorative: styles live in app/themes-layers.css and key off the theme's data-* attributes on <html>.
  The parent must be `isolate` so the backdrop's z-index -1 stays above the parent's background.
*/
export function RoomBackdrop() {
  return (
    <div className="room-backdrop" aria-hidden>
      <div className="room-canvas" />
      <div className="room-pattern">
        <div className="room-ht" />
        <div className="room-ht-tint" />
      </div>
      <div className="room-grain" />
    </div>
  );
}
