export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NODE_ENV === 'production'
  ) {
    const { startMdnsAdvertisement } = await import('@/lib/mdns/advertise');
    startMdnsAdvertisement();
  }
}
