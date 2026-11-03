// Isolated deployment smoke for the Click2Cloud V3+1 engine repository.
// This is intentionally not an upload endpoint. The real Portal, adapter
// and native Chrome save pipeline must pass their independent acceptance gates.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.pathname !== '/_lab/health') {
      return new Response('Not Found', { status: 404 });
    }
    return new Response(
      JSON.stringify({ service: 'click2cloud-v3p1-r2-lab', cloudTransferReady: false }),
      { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }
    );
  },
};
