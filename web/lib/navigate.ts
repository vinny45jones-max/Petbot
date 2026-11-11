// Переход на внешний/полный URL (обёртка — чтобы подменять в тестах: jsdom не умеет навигацию).
export function navigate(url: string): void {
  window.location.href = url;
}
