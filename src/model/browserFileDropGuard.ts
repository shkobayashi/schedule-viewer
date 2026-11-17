export function preventBrowserFileNavigation(event: DragEvent): void {
  event.preventDefault();
}

/** ブラウザが落としたファイルへページを移さない。スケジュールを開く処理はここには無い。 */
export function installBrowserFileDropGuard(): void {
  window.addEventListener("dragover", preventBrowserFileNavigation);
  window.addEventListener("drop", preventBrowserFileNavigation);
}
