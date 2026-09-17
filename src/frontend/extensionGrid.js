function installExtensionGridStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('pglite-extension-grid')) return;

  const style = document.createElement('style');
  style.id = 'pglite-extension-grid';
  style.textContent = `
    div:has(> .largeFormMarker [data-testid="pgliteExt_vector"]) {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      column-gap: 1.25rem;
      align-items: center;
    }
    div:has(> .largeFormMarker [data-testid="pgliteExt_vector"]) > .largeFormMarker {
      margin-top: 0.2rem;
      margin-bottom: 0.2rem;
    }
    div:has(> .largeFormMarker [data-testid="pgliteExt_vector"]) > :has([data-testid="pgliteExtPostgres18"]) {
      grid-column: 1 / -1;
    }
  `;
  document.head.appendChild(style);
}

installExtensionGridStyle();
