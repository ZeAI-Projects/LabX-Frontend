let openDialogCount = 0;

export function openRoadmapDialog(dialog) {
  const trigger = document.activeElement;
  dialog.show();
  openDialogCount += 1;
  document.documentElement.classList.add('roadmap-dialog-open');
  dialog.querySelector('button')?.focus();
  return () => {
    if (dialog.open) dialog.close();
    openDialogCount = Math.max(0, openDialogCount - 1);
    if (openDialogCount === 0) document.documentElement.classList.remove('roadmap-dialog-open');
    queueMicrotask(() => { if (trigger?.isConnected) trigger.focus(); });
  };
}
