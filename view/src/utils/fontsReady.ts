// Prisma UI (Ultralight) keeps the box of text laid out before a web font finished loading,
// cutting off the end of wider lines. Once the bundled fonts are ready, flag the document so
// a CSS rule forces one relayout with the real font metrics. A timer covers engines without
// the Font Loading API.
const HUD_FONT_WEIGHTS = [400, 500, 600, 700];

export function markFontsReadyWhenLoaded(root: HTMLElement = document.documentElement): void {
  const mark = () => root.classList.add('tw-fonts-ready');
  const fallback = window.setTimeout(mark, 2000);
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.load) return;
  // `fonts.ready` alone can resolve before a face is first needed, so load each weight.
  Promise.all(HUD_FONT_WEIGHTS.map(weight => fonts.load(`${weight} 16px "Tullius Pretendard"`, '가1')))
    .then(() => {
      window.clearTimeout(fallback);
      // One more frame so layout has used the loaded faces before the forced relayout.
      window.requestAnimationFrame(mark);
    })
    .catch(mark);
}
