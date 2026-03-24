import Bonjour from 'bonjour-service';

export function startMdnsAdvertisement(): void {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const bonjour = new Bonjour();
  bonjour.publish({ name: 'thefridge', type: 'http', port });
  console.log(`[mdns] Advertising thefridge.local on port ${port}`);

  const cleanup = () => {
    console.log('[mdns] Stopping advertisement');
    bonjour.unpublishAll(() => bonjour.destroy());
  };
  process.once('SIGTERM', cleanup);
  process.once('SIGINT', cleanup);
}
