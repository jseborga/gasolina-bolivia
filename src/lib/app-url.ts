export function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://appn8n-gasolina-bolivia.gz5fzd.easypanel.host"
  );
}
